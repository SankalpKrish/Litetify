import type { ModEntry } from './manifest';
import { readModFile } from './loader';
import { createLitetifyAPI, type LitetifyAPI } from './api';
import { filterApiByPermissions } from './permissions';

interface InvokeMessage {
  id: string;
  type: 'invoke';
  method: string;
  args: unknown[];
  _token?: string;
}

type SandboxRequest =
  | InvokeMessage
  | {
      type: 'console';
      method: string;
      args: string[];
      modId: string;
      _token?: string;
    };

interface ResultMessage {
  type: 'result';
  id: string;
  result: unknown;
}

interface ErrorMessage {
  type: 'error';
  id: string;
  error: string;
}

type SandboxResponse = ResultMessage | ErrorMessage;

const API_VERSION = '1.0.0';

let apiInstance: LitetifyAPI | null = null;

function buildDispatcher(
  api: LitetifyAPI,
  permissions: string[],
): Record<string, (...args: unknown[]) => unknown> {
  const filtered = filterApiByPermissions(
    api as unknown as Record<string, unknown>,
    permissions,
  );
  const dispatch: Record<string, (...args: unknown[]) => unknown> = {};
  function flatten(obj: Record<string, unknown>, prefix: string) {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'function') {
        dispatch[path] = value as (...args: unknown[]) => unknown;
      } else if (typeof value === 'object' && value !== null) {
        flatten(value as Record<string, unknown>, path);
      }
    }
  }
  flatten(filtered as unknown as Record<string, unknown>, '');
  return dispatch;
}

const loadedIframes = new Map<string, HTMLIFrameElement>();
const extensionMessageHandlers = new Map<
  string,
  (event: MessageEvent) => void
>();
const extensionTokens = new Map<string, string>();

function escapeForScript(code: string): string {
  return code
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\${/g, '\\${')
    .replace(/<\/script>/gi, '<\\/script>');
}

function buildSandboxHtml(code: string, modId: string, token: string): string {
  const safeCode = escapeForScript(code);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
"use strict";

var _reqId = 0;
var _pending = {};
var _modResult = (function () {
${safeCode}
})();

var _token = "${token}";

window.addEventListener("message", function (event) {
  var msg = event.data;
  if (!msg) return;
  if (msg.type === "unload") {
    if (_modResult && typeof _modResult.unload === "function") {
      _modResult.unload();
    }
    return;
  }
  if (msg.type === "result" || msg.type === "error") {
    var handler = _pending[msg.id];
    if (!handler) return;
    delete _pending[msg.id];
    if (msg.type === "error") {
      handler.reject(new Error(msg.error));
    } else {
      handler.resolve(msg.result);
    }
  }
});

var Litetify = {
  version: "${API_VERSION}",
  player: proxyObj("player"),
  library: proxyObj("library"),
  ui: proxyObj("ui"),
  storage: proxyObj("storage"),
  events: proxyObj("events"),
};

function proxyObj(prefix) {
  return new Proxy({}, {
    get: function (target, prop) {
      if (prop === "then") return undefined;
      return function () {
        var args = Array.prototype.slice.call(arguments);
        return sendInvoke(prefix + "." + prop, args);
      };
    },
  });
}

function sendInvoke(method, args) {
  var id = String(++_reqId);
  return new Promise(function (resolve, reject) {
    _pending[id] = { resolve: resolve, reject: reject };
    parent.postMessage({ type: "invoke", id: id, method: method, args: args, _token: _token }, "*");
  });
}

var console = {
  log: function () {
    parent.postMessage({ type: "console", method: "log", modId: "${modId}", args: Array.prototype.map.call(arguments, String), _token: _token }, "*");
  },
  warn: function () {
    parent.postMessage({ type: "console", method: "warn", modId: "${modId}", args: Array.prototype.map.call(arguments, String), _token: _token }, "*");
  },
  error: function () {
    parent.postMessage({ type: "console", method: "error", modId: "${modId}", args: Array.prototype.map.call(arguments, String), _token: _token }, "*");
  },
  info: function () {
    parent.postMessage({ type: "console", method: "info", modId: "${modId}", args: Array.prototype.map.call(arguments, String), _token: _token }, "*");
  },
};
<\\/script>
</body>
</html>`;
}

export async function loadExtension(mod: ModEntry): Promise<void> {
  if (mod.manifest.type !== 'extension') return;

  const code = await readModFile(mod.path, mod.manifest.entry);
  const modId = mod.manifest.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const token =
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

  if (!apiInstance) {
    apiInstance = createLitetifyAPI(modId);
  }
  const dispatcher = buildDispatcher(
    apiInstance,
    mod.manifest.permissions || [],
  );

  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', 'allow-scripts');
  iframe.style.display = 'none';
  iframe.title = `mod:${modId}`;

  const messageHandler = (
    event: MessageEvent<SandboxRequest | SandboxResponse>,
  ): void => {
    if (event.origin !== 'null') return;

    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    if ('method' in msg && msg.type === 'invoke') {
      const invoke = msg as InvokeMessage;
      if (invoke._token !== token) return;
      const fn = dispatcher[invoke.method];
      if (!fn) {
        iframe.contentWindow?.postMessage(
          {
            type: 'error',
            id: invoke.id,
            error: `Unknown method: ${invoke.method}`,
          },
          '*',
        );
        return;
      }
      try {
        const result = fn(...invoke.args);
        if (result instanceof Promise) {
          result.then((r) =>
            iframe.contentWindow?.postMessage(
              { type: 'result', id: invoke.id, result: r },
              '*',
            ),
          );
          result.catch((err) =>
            iframe.contentWindow?.postMessage(
              { type: 'error', id: invoke.id, error: (err as Error).message },
              '*',
            ),
          );
        } else {
          iframe.contentWindow?.postMessage(
            { type: 'result', id: invoke.id, result },
            '*',
          );
        }
      } catch (err) {
        iframe.contentWindow?.postMessage(
          { type: 'error', id: invoke.id, error: (err as Error).message },
          '*',
        );
      }
      return;
    }

    if (msg.type === 'console') {
      const c = msg;
      if (c._token !== token) return;
      const fn = (
        console as unknown as Record<string, (...args: string[]) => void>
      )[c.method];
      if (fn) fn(`[mod:${c.modId}]`, ...c.args);
      return;
    }
  };

  window.addEventListener('message', messageHandler);
  extensionMessageHandlers.set(modId, messageHandler);
  extensionTokens.set(modId, token);

  const html = buildSandboxHtml(code, modId, token);

  return new Promise<void>((resolve) => {
    iframe.onload = () => resolve();
    iframe.srcdoc = html;
    document.body.appendChild(iframe);
    loadedIframes.set(modId, iframe);
  });
}

export function unloadExtension(modId: string): void {
  const iframe = loadedIframes.get(modId);
  if (!iframe) return;

  iframe.contentWindow?.postMessage({ type: 'unload' }, '*');

  const handler = extensionMessageHandlers.get(modId);
  if (handler) {
    window.removeEventListener('message', handler);
    extensionMessageHandlers.delete(modId);
  }
  extensionTokens.delete(modId);

  iframe.remove();
  loadedIframes.delete(modId);
}

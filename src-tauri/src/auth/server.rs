use std::sync::mpsc;
use std::thread;
use std::time::Duration;
use tiny_http::{Response, Server};

pub struct CallbackResult {
    pub code: String,
    pub state: String,
}

const HTML_SUCCESS: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Signed in to Litetify</title>
  <style>
    *,*::before,*::after{box-sizing:border-box}
    body{display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#08090B;color:#FFFFFF;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
    .wrap{text-align:center;padding:2.5rem 2rem;max-width:360px;width:100%}
    .brand{width:36px;height:36px;background:#15181D;border-radius:28%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem}
    .brand svg{display:block;width:22px;height:22px}
    .check-ring{width:56px;height:56px;border-radius:50%;background:rgba(216,226,224,0.12);display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;animation:fadeIn 0.35s ease-out}
    .check{font-size:1.5rem;color:#D8E2E0;line-height:1}
    h1{margin:0 0 0.35rem;font-size:1.2rem;font-weight:600;letter-spacing:-0.015em}
    .sub{margin:0;font-size:0.85rem;color:#C4CCC9;line-height:1.5}
    .pill{display:inline-flex;align-items:center;gap:6px;margin-top:1.5rem;padding:6px 14px;border-radius:999px;background:rgba(216,226,224,0.12);border:1px solid rgba(216,226,224,0.2);font-size:0.78rem;color:#D8E2E0;font-weight:500}
    .pill-dot{width:6px;height:6px;border-radius:50%;background:#D8E2E0;animation:pulse 1.8s ease-in-out infinite}
    .footer{margin-top:2rem;font-size:0.72rem;color:#9AA8A4;line-height:1.4}
    @keyframes fadeIn{0%{opacity:0;transform:scale(0.88)}100%{opacity:1;transform:scale(1)}}
    @keyframes pulse{0%,70%,100%{opacity:0.3}35%{opacity:1}}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="brand" aria-hidden="true"><svg viewBox="0 0 120 120"><defs><clipPath id="m"><path d="M88 10 C101 34 98 60 72 82 C60 92 38 95 28 96 C30 82 38 64 52 48 C62 37 76 20 88 10 Z"/></clipPath></defs><path d="M88 10 C101 34 98 60 72 82 C60 92 38 95 28 96 C30 82 38 64 52 48 C62 37 76 20 88 10 Z" fill='#fff'/><g clip-path="url(#m)"><g fill='#56606D'><circle cx="31" cy="93" r="1.6"/><path d="M29.68 92.1 L69.64 33.78 L73.14 29.03 L76.87 24.44 L80.63 19.88 L83.07 16.79 L84.82 14.42 L85.67 13.22 L84.85 14.44 L83.27 16.93 L81.27 20.32 L78.37 25.48 L75.44 30.61 L72.28 35.58 L32.32 93.9 Z"/></g></g></svg></div>
    <div class="check-ring"><span class="check">&#10003;</span></div>
    <h1>You are signed in</h1>
    <p class="sub">Your Spotify account has been connected to Litetify. You can safely close this window.</p>
    <div class="pill"><span class="pill-dot"></span>Returning to app...</div>
    <p class="footer">Litetify &mdash; a Spotify client</p>
  </div>
  <script>window.close()</script>
</body>
</html>"#;

const HTML_ERROR: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sign in failed — Litetify</title>
  <style>
    *,*::before,*::after{box-sizing:border-box}
    body{display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#08090B;color:#FFFFFF;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
    .wrap{text-align:center;padding:2.5rem 2rem;max-width:360px;width:100%}
    .brand{width:36px;height:36px;background:#15181D;border-radius:28%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem}
    .brand svg{display:block;width:22px;height:22px}
    .x-ring{width:56px;height:56px;border-radius:50%;background:rgba(231,76,60,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem}
    .x{font-size:1.5rem;color:#e74c3c;line-height:1}
    h1{margin:0 0 0.35rem;font-size:1.2rem;font-weight:600;letter-spacing:-0.015em}
    .sub{margin:0;font-size:0.85rem;color:#C4CCC9;line-height:1.5}
    .footer{margin-top:2rem;font-size:0.72rem;color:#9AA8A4;line-height:1.4}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="brand" aria-hidden="true"><svg viewBox="0 0 120 120"><defs><clipPath id="m"><path d="M88 10 C101 34 98 60 72 82 C60 92 38 95 28 96 C30 82 38 64 52 48 C62 37 76 20 88 10 Z"/></clipPath></defs><path d="M88 10 C101 34 98 60 72 82 C60 92 38 95 28 96 C30 82 38 64 52 48 C62 37 76 20 88 10 Z" fill='#fff'/><g clip-path="url(#m)"><g fill='#56606D'><circle cx="31" cy="93" r="1.6"/><path d="M29.68 92.1 L69.64 33.78 L73.14 29.03 L76.87 24.44 L80.63 19.88 L83.07 16.79 L84.82 14.42 L85.67 13.22 L84.85 14.44 L83.27 16.93 L81.27 20.32 L78.37 25.48 L75.44 30.61 L72.28 35.58 L32.32 93.9 Z"/></g></g></svg></div>
    <div class="x-ring"><span class="x">&#10007;</span></div>
    <h1>Sign in failed</h1>
    <p class="sub">The connection could not be completed. Close this window and try again from Litetify.</p>
    <p class="footer">Litetify &mdash; a Spotify client</p>
  </div>
</body>
</html>"#;

pub struct CallbackServer {
    pub port: u16,
    pub receiver: mpsc::Receiver<CallbackResult>,
    handle: Option<thread::JoinHandle<()>>,
}

impl CallbackServer {
    pub fn start(port: u16, expected_state: String) -> Result<Self, String> {
        let addr = format!("127.0.0.1:{port}");
        let server = Server::http(&addr).map_err(|e| format!("server bind error: {e}"))?;
        let actual_port = server
            .server_addr()
            .to_ip()
            .ok_or("failed to resolve server address")?
            .port();

        let (tx, receiver) = mpsc::channel();

        let handle = thread::spawn(move || {
            if let Some(request) = server.incoming_requests().next() {
                let url = request.url();
                let response = Self::handle_request(url, &expected_state, &tx);

                let status = match &response {
                    Ok(_) => 200,
                    Err(code) => *code,
                };
                let body = match response {
                    Ok(_) | Err(400) | Err(403) => {
                        if response.is_ok() {
                            HTML_SUCCESS
                        } else {
                            HTML_ERROR
                        }
                    }
                    _ => HTML_ERROR,
                };

                let resp = Response::from_string(body).with_status_code(status);
                let _ = request.respond(resp);
            }
        });

        Ok(Self {
            port: actual_port,
            receiver,
            handle: Some(handle),
        })
    }

    fn handle_request(
        url: &str,
        expected_state: &str,
        tx: &mpsc::Sender<CallbackResult>,
    ) -> Result<(), i32> {
        let parsed = match url::Url::parse(&format!("http://127.0.0.1{url}")) {
            Ok(u) => u,
            Err(_) => return Err(400),
        };

        if parsed.query_pairs().find(|(k, _)| k == "error").is_some() {
            return Err(400);
        }

        let code = parsed
            .query_pairs()
            .find(|(k, _)| k == "code")
            .map(|(_, v)| v.to_string());

        let state = parsed
            .query_pairs()
            .find(|(k, _)| k == "state")
            .map(|(_, v)| v.to_string());

        match (code, state) {
            (Some(code_val), Some(state_val)) if state_val == expected_state => {
                let _ = tx.send(CallbackResult {
                    code: code_val,
                    state: state_val,
                });
                Ok(())
            }
            (Some(_), Some(_)) => Err(403),
            _ => Err(400),
        }
    }
}

impl Drop for CallbackServer {
    fn drop(&mut self) {
        if let Some(handle) = self.handle.take() {
            let timeout = Duration::from_secs(5);
            let start = std::time::Instant::now();
            while start.elapsed() < timeout {
                if handle.is_finished() {
                    let _ = handle.join();
                    return;
                }
                std::thread::sleep(Duration::from_millis(100));
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpStream;
    use std::time::Duration;

    fn make_request(port: u16, path: &str) -> String {
        let addr = format!("127.0.0.1:{port}");
        let mut stream =
            TcpStream::connect_timeout(&addr.parse().unwrap(), Duration::from_secs(2)).unwrap();
        let req =
            format!("GET {path} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nConnection: close\r\n\r\n");
        stream.write_all(req.as_bytes()).unwrap();
        let mut buf = String::new();
        stream.read_to_string(&mut buf).unwrap();
        buf
    }

    #[test]
    fn test_server_captures_code() {
        let server = CallbackServer::start(0, "test-state".into()).unwrap();
        let resp = make_request(server.port, "/callback?code=abc123&state=test-state");
        assert!(resp.contains("200"), "expected 200, got: {resp}");
        let result = server
            .receiver
            .recv_timeout(Duration::from_secs(2))
            .unwrap();
        assert_eq!(result.code, "abc123");
    }

    #[test]
    fn test_server_rejects_wrong_state() {
        let server = CallbackServer::start(0, "expected-state".into()).unwrap();
        let resp = make_request(server.port, "/callback?code=abc123&state=wrong-state");
        assert!(
            resp.contains("403") || resp.contains("400"),
            "expected 4xx, got: {resp}"
        );
    }

    #[test]
    fn test_server_rejects_missing_params() {
        let server = CallbackServer::start(0, "state".into()).unwrap();
        let resp = make_request(server.port, "/callback");
        assert!(resp.contains("400"), "expected 400, got: {resp}");
    }

    #[test]
    fn test_server_rejects_error_param() {
        let server = CallbackServer::start(0, "state".into()).unwrap();
        let resp = make_request(server.port, "/callback?error=access_denied&state=state");
        assert!(resp.contains("400"), "expected 400, got: {resp}");
    }
}

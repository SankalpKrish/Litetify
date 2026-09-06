use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use rand::Rng;
use sha2::{Digest, Sha256};

fn random_base64(nbytes: usize) -> String {
    let bytes: Vec<u8> = (0..nbytes).map(|_| rand::thread_rng().gen()).collect();
    URL_SAFE_NO_PAD.encode(&bytes)
}

pub fn generate_code_verifier() -> String {
    random_base64(32)
}

pub fn code_challenge(verifier: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    URL_SAFE_NO_PAD.encode(hasher.finalize())
}

pub fn generate_state() -> String {
    random_base64(32)
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_known_pkce_vector() {
        let verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
        let challenge = code_challenge(verifier);
        assert_eq!(challenge, "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
    }

    #[test]
    fn test_generates_verifier_length() {
        for _ in 0..10 {
            let v = generate_code_verifier();
            assert!(
                (43..=128).contains(&v.len()),
                "verifier length {} not in 43..128",
                v.len()
            );
        }
    }

    #[test]
    fn test_challenge_is_deterministic() {
        let v = generate_code_verifier();
        let c1 = code_challenge(&v);
        let c2 = code_challenge(&v);
        assert_eq!(c1, c2);
    }

    #[test]
    fn test_different_verifiers_give_different_challenges() {
        let v1 = generate_code_verifier();
        let v2 = generate_code_verifier();
        assert_ne!(v1, v2);
        assert_ne!(code_challenge(&v1), code_challenge(&v2));
    }

    #[test]
    fn test_generate_state_length() {
        for _ in 0..10 {
            let s = generate_state();
            assert_eq!(s.len(), 43);
        }
    }
}

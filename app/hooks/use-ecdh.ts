import { useCallback } from "react";

export type ECDHKeyPair = {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
};

type UseECDHHook = {
  generateKeyPair: () => Promise<ECDHKeyPair>;
  importPublicKey: (publicKeyData: ArrayBuffer) => Promise<CryptoKey>;
  deriveSharedSecret: (
    privateKey: CryptoKey,
    publicKey: CryptoKey,
  ) => Promise<ArrayBuffer>;
  deriveAESKey: (sharedSecret: ArrayBuffer) => Promise<CryptoKey>;
};

export const useECDH = (): UseECDHHook => {
  /**
   * Generate a new ECDH key pair using P-256 curve
   */
  const generateKeyPair = useCallback(async (): Promise<ECDHKeyPair> => {
    try {
      const keyPair = await crypto.subtle.generateKey(
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        true,
        ["deriveKey", "deriveBits"],
      );

      return {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
      };
    } catch (error) {
      throw new Error(`Failed to generate ECDH key pair: ${error}`);
    }
  }, []);

  /**
   * Import a public key from ArrayBuffer received from another client
   */
  const importPublicKey = useCallback(
    async (publicKey: ArrayBuffer): Promise<CryptoKey> => {
      try {
        return crypto.subtle.importKey(
          "raw",
          publicKey,
          {
            name: "ECDH",
            namedCurve: "P-256",
          },
          true,
          [],
        );
      } catch (error) {
        throw new Error(`Failed to import public key: ${error}`);
      }
    },
    [],
  );

  /**
   * Derive shared secret from your private key and the other party's public key
   */
  const deriveSharedSecret = useCallback(
    async (
      privateKey: CryptoKey,
      publicKey: CryptoKey,
    ): Promise<ArrayBuffer> => {
      try {
        return crypto.subtle.deriveBits(
          {
            name: "ECDH",
            public: publicKey,
          },
          privateKey,
          256,
        );
      } catch (error) {
        throw new Error(`Failed to derive shared secret: ${error}`);
      }
    },
    [],
  );

  /**
   * Derive an AES-GCM key from the shared secret for symmetric encryption
   */
  const deriveAESKey = useCallback(
    async (sharedSecret: ArrayBuffer): Promise<CryptoKey> => {
      try {
        // Use HKDF to derive a proper AES key from the shared secret
        const hkdfKey = await crypto.subtle.importKey(
          "raw",
          sharedSecret,
          "HKDF",
          false,
          ["deriveKey"],
        );

        return await crypto.subtle.deriveKey(
          {
            name: "HKDF",
            hash: "SHA-256",
            salt: new Uint8Array(0),
            info: new TextEncoder().encode("ECDH-AES-KEY"),
          },
          hkdfKey,
          {
            name: "AES-GCM",
            length: 256,
          },
          true,
          ["encrypt", "decrypt"],
        );
      } catch (error) {
        throw new Error(`Failed to derive AES key: ${error}`);
      }
    },
    [],
  );

  return {
    generateKeyPair,
    importPublicKey,
    deriveSharedSecret,
    deriveAESKey,
  };
};

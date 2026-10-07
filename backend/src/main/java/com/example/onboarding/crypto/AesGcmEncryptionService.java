package com.example.onboarding.crypto;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class AesGcmEncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int IV_LENGTH_BYTES = 12;
    private static final int TAG_LENGTH_BITS = 128;
    private static final String KEY_VERSION = "v1";

    private final SecretKey databaseKey;
    private final SecretKey evidenceKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public AesGcmEncryptionService(
            @Value("${app.crypto.database-key-hex}") String dbKeyHex,
            @Value("${app.crypto.evidence-key-hex}") String evidenceKeyHex) {
        byte[] dbBytes = HexFormat.of().parseHex(dbKeyHex);
        byte[] evBytes = HexFormat.of().parseHex(evidenceKeyHex);
        this.databaseKey = new SecretKeySpec(dbBytes, "AES");
        this.evidenceKey = new SecretKeySpec(evBytes, "AES");
    }

    public String encryptDatabaseField(String plaintext) {
        if (plaintext == null) {
            return null;
        }
        return encryptToString(plaintext.getBytes(StandardCharsets.UTF_8), databaseKey);
    }

    public String decryptDatabaseField(String ciphertext) {
        if (ciphertext == null || ciphertext.isBlank()) {
            return null;
        }
        byte[] decrypted = decryptFromString(ciphertext, databaseKey);
        return new String(decrypted, StandardCharsets.UTF_8);
    }

    public byte[] encryptEvidence(byte[] rawBytes) {
        return encryptBytes(rawBytes, evidenceKey);
    }

    public byte[] decryptEvidence(byte[] encryptedBytes) {
        return decryptBytes(encryptedBytes, evidenceKey);
    }

    private String encryptToString(byte[] plaintext, SecretKey key) {
        byte[] cipherBytes = encryptBytes(plaintext, key);
        return KEY_VERSION + ":" + Base64.getEncoder().encodeToString(cipherBytes);
    }

    private byte[] decryptFromString(String ciphertext, SecretKey key) {
        String[] parts = ciphertext.split(":", 2);
        String data = (parts.length == 2) ? parts[1] : parts[0];
        byte[] cipherBytes = Base64.getDecoder().decode(data);
        return decryptBytes(cipherBytes, key);
    }

    private byte[] encryptBytes(byte[] plaintext, SecretKey key) {
        try {
            byte[] iv = new byte[IV_LENGTH_BYTES];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(TAG_LENGTH_BITS, iv);
            cipher.init(Cipher.ENCRYPT_MODE, key, spec);

            byte[] encrypted = cipher.doFinal(plaintext);
            ByteBuffer buffer = ByteBuffer.allocate(iv.length + encrypted.length);
            buffer.put(iv);
            buffer.put(encrypted);
            return buffer.array();
        } catch (Exception e) {
            throw new IllegalStateException("AES-GCM encryption failure", e);
        }
    }

    private byte[] decryptBytes(byte[] cipherBytesWithIv, SecretKey key) {
        try {
            if (cipherBytesWithIv.length < IV_LENGTH_BYTES) {
                throw new IllegalArgumentException("Ciphertext payload too short for IV");
            }
            ByteBuffer buffer = ByteBuffer.wrap(cipherBytesWithIv);
            byte[] iv = new byte[IV_LENGTH_BYTES];
            buffer.get(iv);
            byte[] cipherBytes = new byte[buffer.remaining()];
            buffer.get(cipherBytes);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(TAG_LENGTH_BITS, iv);
            cipher.init(Cipher.DECRYPT_MODE, key, spec);

            return cipher.doFinal(cipherBytes);
        } catch (Exception e) {
            throw new IllegalStateException("AES-GCM decryption failure", e);
        }
    }
}

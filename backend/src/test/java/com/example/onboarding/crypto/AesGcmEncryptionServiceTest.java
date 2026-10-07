package com.example.onboarding.crypto;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class AesGcmEncryptionServiceTest {

    private final String dbKeyHex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    private final String evKeyHex = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
    private final AesGcmEncryptionService service = new AesGcmEncryptionService(dbKeyHex, evKeyHex);

    @Test
    void testDatabaseFieldEncryptionRoundtrip() {
        String plain = "Kamal Perera - 123 Temple Road, Colombo";
        String cipher = service.encryptDatabaseField(plain);
        assertNotNull(cipher);
        assertNotEquals(plain, cipher);
        assertTrue(cipher.startsWith("v1:"));

        String decrypted = service.decryptDatabaseField(cipher);
        assertEquals(plain, decrypted);
    }

    @Test
    void testEvidenceEncryptionRoundtrip() {
        byte[] raw = "Test JPEG Image Raw Bytes 12345".getBytes(StandardCharsets.UTF_8);
        byte[] encrypted = service.encryptEvidence(raw);
        assertNotNull(encrypted);
        assertNotEquals(raw.length, encrypted.length);

        byte[] decrypted = service.decryptEvidence(encrypted);
        assertArrayEquals(raw, decrypted);
    }

    @Test
    void testNullFieldHandling() {
        assertNull(service.encryptDatabaseField(null));
        assertNull(service.decryptDatabaseField(null));
    }
}

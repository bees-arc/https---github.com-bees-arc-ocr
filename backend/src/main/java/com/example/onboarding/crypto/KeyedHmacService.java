package com.example.onboarding.crypto;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

@Service
public class KeyedHmacService {

    private static final String HMAC_SHA256 = "HmacSHA256";
    private final SecretKeySpec hmacKey;

    public KeyedHmacService(@Value("${app.crypto.nic-hmac-secret-hex}") String secretHex) {
        byte[] keyBytes = HexFormat.of().parseHex(secretHex);
        this.hmacKey = new SecretKeySpec(keyBytes, HMAC_SHA256);
    }

    public String computeNicLookupHmac(String canonicalNic) {
        if (canonicalNic == null || canonicalNic.isBlank()) {
            return null;
        }
        try {
            Mac mac = Mac.getInstance(HMAC_SHA256);
            mac.init(hmacKey);
            byte[] hmacBytes = mac.doFinal(canonicalNic.trim().toUpperCase().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hmacBytes);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to calculate keyed HMAC for NIC lookup", e);
        }
    }
}

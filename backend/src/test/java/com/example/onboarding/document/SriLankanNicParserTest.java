package com.example.onboarding.document;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.Month;

import static org.junit.jupiter.api.Assertions.*;

class SriLankanNicParserTest {

    @Test
    void testValidOldNicMale() {
        // Year 1985, Day 015 -> Jan 15, Male, V suffix
        SriLankanNicParser.NicParseResult result = SriLankanNicParser.parse("850151234V");
        assertTrue(result.valid());
        assertEquals(NicLayout.OLD_NIC, result.layout());
        assertEquals("MALE", result.gender());
        assertEquals(LocalDate.of(1985, Month.JANUARY, 15), result.dateOfBirth());
        assertEquals("850151234V", result.canonicalNic());
    }

    @Test
    void testValidOldNicFemale() {
        // Year 1992, Day 540 -> 540 - 500 = 40. Jan=31, Feb=9 -> Feb 9, Female, X suffix
        SriLankanNicParser.NicParseResult result = SriLankanNicParser.parse("925409876x");
        assertTrue(result.valid());
        assertEquals(NicLayout.OLD_NIC, result.layout());
        assertEquals("FEMALE", result.gender());
        assertEquals(LocalDate.of(1992, Month.FEBRUARY, 9), result.dateOfBirth());
        assertEquals("925409876X", result.canonicalNic());
    }

    @Test
    void testValidNewNicMale() {
        // Year 2000, Day 060 -> Day 60 (leap year 2000 has Feb 29) -> Feb 29, Male
        SriLankanNicParser.NicParseResult result = SriLankanNicParser.parse("200006001234");
        assertTrue(result.valid());
        assertEquals(NicLayout.NEW_NIC, result.layout());
        assertEquals("MALE", result.gender());
        assertEquals(LocalDate.of(2000, Month.FEBRUARY, 29), result.dateOfBirth());
    }

    @Test
    void testValidNewNicFemale() {
        // Year 1998, Day 836 -> 836 - 500 = 336 -> Dec 1, Female
        SriLankanNicParser.NicParseResult result = SriLankanNicParser.parse("199883601234");
        assertTrue(result.valid());
        assertEquals(NicLayout.NEW_NIC, result.layout());
        assertEquals("FEMALE", result.gender());
        assertEquals(LocalDate.of(1998, Month.DECEMBER, 1), result.dateOfBirth());
    }

    @Test
    void testInvalidOldNicDayExceeded() {
        // Day 400 is not valid for male (max 366)
        SriLankanNicParser.NicParseResult result = SriLankanNicParser.parse("854001234V");
        assertFalse(result.valid());
        assertEquals("NIC_DOB_CONFLICT", result.errorReason());
    }

    @Test
    void testInvalidCharacters() {
        SriLankanNicParser.NicParseResult result = SriLankanNicParser.parse("850151234Z");
        assertFalse(result.valid());
        assertEquals("NIC_FORMAT_INVALID", result.errorReason());
    }

    @Test
    void testNullAndEmpty() {
        assertFalse(SriLankanNicParser.parse(null).valid());
        assertFalse(SriLankanNicParser.parse("").valid());
    }
}

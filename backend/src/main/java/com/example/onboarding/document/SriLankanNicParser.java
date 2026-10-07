package com.example.onboarding.document;

import java.time.LocalDate;
import java.time.Month;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class SriLankanNicParser {

    private static final Pattern OLD_NIC_PATTERN = Pattern.compile("^(\\d{2})(\\d{3})(\\d{4})([vVxX])$");
    private static final Pattern NEW_NIC_PATTERN = Pattern.compile("^(\\d{4})(\\d{3})(\\d{5})$");

    // Sri Lankan NIC standard day allocation table (accounting for leap year 366 days):
    // Jan: 31 (1..31)
    // Feb: 29 (32..60)
    // Mar: 31 (61..91)
    // Apr: 30 (92..121)
    // May: 31 (122..152)
    // Jun: 30 (153..182)
    // Jul: 31 (183..213)
    // Aug: 31 (214..244)
    // Sep: 30 (245..274)
    // Oct: 31 (275..305)
    // Nov: 30 (306..335)
    // Dec: 31 (336..366)
    private static final int[] DAYS_IN_MONTHS = {31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};

    public record NicParseResult(
            String canonicalNic,
            NicLayout layout,
            LocalDate dateOfBirth,
            String gender,
            boolean valid,
            String errorReason
    ) {}

    public static NicParseResult parse(String rawInput) {
        if (rawInput == null) {
            return new NicParseResult(null, NicLayout.UNKNOWN, null, null, false, "NIC_EMPTY");
        }
        String cleaned = rawInput.trim().replaceAll("[\\s-]+", "");

        Matcher oldMatcher = OLD_NIC_PATTERN.matcher(cleaned);
        if (oldMatcher.matches()) {
            return parseOldNic(oldMatcher, cleaned);
        }

        Matcher newMatcher = NEW_NIC_PATTERN.matcher(cleaned);
        if (newMatcher.matches()) {
            return parseNewNic(newMatcher, cleaned);
        }

        return new NicParseResult(cleaned, NicLayout.UNKNOWN, null, null, false, "NIC_FORMAT_INVALID");
    }

    private static NicParseResult parseOldNic(Matcher matcher, String cleaned) {
        int yearTwoDigits = Integer.parseInt(matcher.group(1));
        int birthYear = 1900 + yearTwoDigits;
        int rawDays = Integer.parseInt(matcher.group(2));
        char checkChar = Character.toUpperCase(matcher.group(4).charAt(0));
        String canonical = matcher.group(1) + matcher.group(2) + matcher.group(3) + checkChar;

        String gender = "MALE";
        int days = rawDays;
        if (rawDays > 500) {
            gender = "FEMALE";
            days = rawDays - 500;
        }

        Optional<MonthDayResult> monthDayOpt = resolveMonthAndDay(days);
        if (monthDayOpt.isEmpty()) {
            return new NicParseResult(canonical, NicLayout.OLD_NIC, null, gender, false, "NIC_DOB_CONFLICT");
        }

        MonthDayResult md = monthDayOpt.get();
        // Adjust leap year day 29 for non-leap years if needed, or represent exact calendar birthdate
        LocalDate dob;
        try {
            if (md.month == Month.FEBRUARY && md.day == 29 && !isLeapYear(birthYear)) {
                // In non-leap years, Sri Lankan Department of Registration of Persons algorithm
                // maps day 60 (Feb 29) to March 1st or Feb 28th. Standard official practice maps to Mar 1.
                dob = LocalDate.of(birthYear, Month.MARCH, 1);
            } else {
                dob = LocalDate.of(birthYear, md.month, md.day);
            }
        } catch (Exception e) {
            return new NicParseResult(canonical, NicLayout.OLD_NIC, null, gender, false, "NIC_DOB_CONFLICT");
        }

        return new NicParseResult(canonical, NicLayout.OLD_NIC, dob, gender, true, null);
    }

    private static NicParseResult parseNewNic(Matcher matcher, String cleaned) {
        int birthYear = Integer.parseInt(matcher.group(1));
        int rawDays = Integer.parseInt(matcher.group(2));
        String canonical = cleaned;

        if (birthYear < 1900 || birthYear > LocalDate.now().getYear()) {
            return new NicParseResult(canonical, NicLayout.NEW_NIC, null, null, false, "NIC_DOB_CONFLICT");
        }

        String gender = "MALE";
        int days = rawDays;
        if (rawDays > 500) {
            gender = "FEMALE";
            days = rawDays - 500;
        }

        Optional<MonthDayResult> monthDayOpt = resolveMonthAndDay(days);
        if (monthDayOpt.isEmpty()) {
            return new NicParseResult(canonical, NicLayout.NEW_NIC, null, gender, false, "NIC_DOB_CONFLICT");
        }

        MonthDayResult md = monthDayOpt.get();
        LocalDate dob;
        try {
            if (md.month == Month.FEBRUARY && md.day == 29 && !isLeapYear(birthYear)) {
                dob = LocalDate.of(birthYear, Month.MARCH, 1);
            } else {
                dob = LocalDate.of(birthYear, md.month, md.day);
            }
        } catch (Exception e) {
            return new NicParseResult(canonical, NicLayout.NEW_NIC, null, gender, false, "NIC_DOB_CONFLICT");
        }

        return new NicParseResult(canonical, NicLayout.NEW_NIC, dob, gender, true, null);
    }

    private static record MonthDayResult(Month month, int day) {}

    private static Optional<MonthDayResult> resolveMonthAndDay(int dayOfYear) {
        if (dayOfYear < 1 || dayOfYear > 366) {
            return Optional.empty();
        }
        int currentCount = dayOfYear;
        for (int m = 0; m < 12; m++) {
            int daysInThisMonth = DAYS_IN_MONTHS[m];
            if (currentCount <= daysInThisMonth) {
                return Optional.of(new MonthDayResult(Month.of(m + 1), currentCount));
            }
            currentCount -= daysInThisMonth;
        }
        return Optional.empty();
    }

    private static boolean isLeapYear(int year) {
        return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    }
}

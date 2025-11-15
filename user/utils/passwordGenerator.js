import crypto from 'crypto';

class PasswordGenerator {
    static generate(length = 12) {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*';

        const allChars = uppercase + lowercase + numbers + symbols;
        let password = '';

        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += symbols[Math.floor(Math.random() * symbols.length)];
        for (let i = password.length; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }

        return password.split('').sort(() => Math.random() - 0.5).join('');
    }

    static generateUniqueNumber() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    static generateAdminRegistrationNumber() {
        const uniqueNumber = this.generateUniqueNumber();
        return `ADM-${uniqueNumber}`;
    }

    static generateStaffRegistrationNumber(departmentShortName) {
        if (!departmentShortName) {
            throw new Error('Department short name is required for staff registration number');
        }

        const uniqueNumber = this.generateUniqueNumber();
        return `${departmentShortName.toUpperCase()}-${uniqueNumber}`;
    }

    static generateTeacherRegistrationNumber(departmentShortName) {
        if (!departmentShortName) {
            throw new Error('Department short name is required for teacher registration number');
        }

        const uniqueNumber = this.generateUniqueNumber();
        return `${departmentShortName.toUpperCase()}-${uniqueNumber}`;
    }

    static generateStudentRegistrationNumber(departmentShortName, batchName, batchYear) {
        if (!departmentShortName || !batchName || !batchYear) {
            throw new Error('Department short name, batch name, and batch year are required for student registration number');
        }

        const uniqueNumber = this.generateUniqueNumber();
        const yearShort = batchYear.toString().slice(-2); // Get last 2 digits of year

        return `${departmentShortName.toUpperCase()}-${batchName.toUpperCase()}-${yearShort}-${uniqueNumber}`;
    }

    static generateRegistrationNumber(prefix = 'USR') {
        const timestamp = Date.now().toString().slice(-8);
        const random = crypto.randomBytes(2).toString('hex').toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }
}

export default PasswordGenerator;


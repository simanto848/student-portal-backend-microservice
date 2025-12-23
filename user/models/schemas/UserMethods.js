import bcrypt from "bcrypt";

export const attachUserMethods = (schema) => {
    schema.methods.comparePassword = async function (candidatePassword) {
        return await bcrypt.compare(candidatePassword, this.password);
    };

    schema.methods.changedPasswordAfter = function (JWTTimestamp) {
        if (this.passwordChangedAt) {
            const changedTimestamp = parseInt(
                this.passwordChangedAt.getTime() / 1000,
                10
            );
            return JWTTimestamp < changedTimestamp;
        }
        return false;
    };

    schema.methods.softDelete = function () {
        this.deletedAt = new Date();
        return this.save();
    };

    schema.methods.restore = function () {
        this.deletedAt = null;
        return this.save();
    };
    schema.methods.getProfileCompleteness = function () {
        const requiredFields = [
            "email",
            "fullName",
            "registrationNumber",
            "phoneNumber",
            "profileImage",
            "address",
        ];
        let filled = 0;

        requiredFields.forEach((field) => {
            if (this[field]) {
                if (field === "address") {
                    if (this.address && (this.address.city || this.address.street)) filled++;
                } else {
                    filled++;
                }
            }
        });

        return Math.round((filled / requiredFields.length) * 100);
    };
};


export const attachUserHooks = (schema) => {
    schema.index({ deletedAt: 1 });

    schema.pre(/^find/, function (next) {
        if (this.getOptions().includeDeleted !== true) {
            this.where({ deletedAt: null });
        }
        next();
    });

    schema.pre("save", async function (next) {
        if (!this.isModified("password")) {
            return next();
        }
        this.password = await bcrypt.hash(this.password, 12);
        if (!this.isNew) {
            this.passwordChangedAt = Date.now() - 1000;
        }
        next();
    });
};

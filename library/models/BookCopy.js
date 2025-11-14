import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const bookCopySchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
    }
)

bookCopySchema.index({ deletedAt: 1 });
bookCopySchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

bookCopySchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

bookCopySchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const BookCopy = mongoose.model("BookCopy", bookCopySchema);

export default BookCopy;
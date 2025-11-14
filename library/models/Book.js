import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const bookSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
    }
)

bookSchema.index({ deletedAt: 1 });
bookSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

bookSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

bookSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const Book = mongoose.model("Book", bookSchema);

export default Book;
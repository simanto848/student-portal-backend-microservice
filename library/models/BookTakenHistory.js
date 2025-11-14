import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const bookTakenHistorySchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
    }
)

bookTakenHistorySchema.index({ deletedAt: 1 });
bookTakenHistorySchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

bookTakenHistorySchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

bookTakenHistorySchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const BookTakenHistory = mongoose.model("BookTakenHistory", bookTakenHistorySchema);

export default BookTakenHistory;
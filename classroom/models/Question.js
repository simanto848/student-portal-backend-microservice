import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const optionSchema = new mongoose.Schema({
    id: {
        type: String,
        default: uuidv4
    },
    text: {
        type: String,
        required: true,
        trim: true
    },
    isCorrect: {
        type: Boolean,
        default: false
    }
}, { _id: false });

const questionSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: uuidv4
    },
    quizId: {
        type: String,
        required: true,
        ref: 'Quiz',
        index: true
    },
    type: {
        type: String,
        enum: ['mcq_single', 'mcq_multiple', 'true_false', 'short_answer', 'long_answer'],
        required: [true, 'Question type is required']
    },
    text: {
        type: String,
        required: [true, 'Question text is required'],
        trim: true
    },
    content: {
        type: Object,  // TipTap JSON content
        default: null
    },
    contentType: {
        type: String,
        enum: ['plain', 'tiptap'],
        default: 'plain'
    },
    options: {
        type: [optionSchema],
        default: []
    },
    correctAnswer: {
        type: String,
        trim: true
    },
    points: {
        type: Number,
        default: 1,
        min: 0
    },
    order: {
        type: Number,
        default: 0
    },
    explanation: {
        type: String,
        trim: true
    },
    attachments: {
        type: [Object],
        default: []
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    toJSON: {
        transform(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
        }
    }
});

questionSchema.index({ quizId: 1, order: 1 });

questionSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    if (next) next();
});

questionSchema.pre('countDocuments', function (next) {
    this.where({ deletedAt: null });
    if (next) next();
});

questionSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

// Helper to check if answer is correct
questionSchema.methods.checkAnswer = function (answer) {
    switch (this.type) {
        case 'mcq_single':
            const correctOption = this.options.find(o => o.isCorrect);
            return correctOption && answer === correctOption.id;

        case 'mcq_multiple':
            const correctIds = this.options.filter(o => o.isCorrect).map(o => o.id).sort();
            const answerIds = (Array.isArray(answer) ? answer : []).sort();
            return JSON.stringify(correctIds) === JSON.stringify(answerIds);

        case 'true_false':
            const tfCorrect = this.options.find(o => o.isCorrect);
            return tfCorrect && answer === tfCorrect.id;

        case 'short_answer':
            if (!this.correctAnswer) return null; // Needs manual grading
            return answer?.toLowerCase().trim() === this.correctAnswer.toLowerCase().trim();

        case 'long_answer':
            return null; // Always needs manual grading

        default:
            return null;
    }
};

const Question = mongoose.model('Question', questionSchema);
export default Question;

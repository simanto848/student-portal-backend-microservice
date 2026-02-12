import Book from '../models/Book.js';
import BookCopy from '../models/BookCopy.js';
import userServiceClient from '../clients/userServiceClient.js';

export async function buildSearchFilter(search, token, opts = {}) {
    const { copyField = 'copyId', userField = 'userId' } = opts;

    // 1. Search books → matching copy IDs
    const bookIds = await Book.find({
        $or: [
            { title: { $regex: search, $options: 'i' } },
            { author: { $regex: search, $options: 'i' } },
            { isbn: { $regex: search, $options: 'i' } },
        ],
    }).distinct('_id');

    const copyIds = await BookCopy.find({
        $or: [
            { bookId: { $in: bookIds } },
            { copyNumber: { $regex: search, $options: 'i' } },
        ],
    }).distinct('_id');

    // 2. Search users across all 4 types in parallel
    const [students, teachers, staffs, admins] = await Promise.all([
        userServiceClient.searchUsers(search, 'student', token),
        userServiceClient.searchUsers(search, 'teacher', token),
        userServiceClient.searchUsers(search, 'staff', token),
        userServiceClient.searchUsers(search, 'admin', token),
    ]);

    const userIds = [
        ...students.map((u) => u.id || u._id),
        ...teachers.map((u) => u.id || u._id),
        ...staffs.map((u) => u.id || u._id),
        ...admins.map((u) => u.id || u._id),
    ].filter(Boolean);

    return [
        { [copyField]: { $in: copyIds } },
        { [userField]: { $in: userIds } },
    ];
}

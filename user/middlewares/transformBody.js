
export const transformBody = (req, res, next) => {
    if (req.body.data) {
        try {
            // If the frontend sends everything as a JSON string in a 'data' field
            req.body = JSON.parse(req.body.data);
        } catch (error) {
            return res.status(400).json({ success: false, message: 'Invalid JSON data' });
        }
    }

    // Attach file path if file exists
    if (req.file) {
        const filePath = `public/uploads/${req.file.filename}`;

        if (req.body.studentProfile) {
            req.body.studentProfile.profilePicture = filePath;
        } else {
            if (!req.body.profile) req.body.profile = {};
            req.body.profile.profilePicture = filePath;
        }
    }

    next();
};

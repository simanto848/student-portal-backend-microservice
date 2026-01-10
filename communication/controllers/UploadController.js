class UploadController {
    async uploadFile(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: "No file uploaded" });
            }

            // Return the relative path to the file
            // Assuming server serves 'uploads' directory at root or /uploads
            const fileUrl = `/uploads/${req.file.filename}`;

            res.status(200).json({
                success: true,
                data: {
                    url: fileUrl,
                    filename: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size
                }
            });
        } catch (error) {
            console.error("Upload error:", error);
            res.status(500).json({ success: false, message: "File upload failed" });
        }
    }
}

export default new UploadController();

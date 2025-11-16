import http from "http";
import colors from "colors";
import app from "./app.js";
import notificationService from "./services/notificationService.js";
import borrowingService from "./services/borrowingService.js";

const server = http.createServer(app);

const PORT = process.env.PORT || 8008;

server.listen(PORT, () => {
    console.log(`Library service started on http://localhost:${PORT}`.green.underline.bold);
    
    // Start scheduled notification jobs
    notificationService.startScheduledJobs();
    
    // Run initial overdue check
    borrowingService.checkAndUpdateOverdueBooks()
        .then(() => console.log('Initial overdue check completed'))
        .catch(err => console.error('Error in initial overdue check:', err));
});
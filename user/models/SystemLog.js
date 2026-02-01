import mongoose from "mongoose";
import { systemLogSchemaDef, systemLogOptions } from "shared";

const localSchema = new mongoose.Schema(systemLogSchemaDef, systemLogOptions);
const SystemLog = mongoose.model("SystemLog", localSchema);

export default SystemLog;

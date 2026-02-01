import mongoose from "mongoose";
import { apiMetricSchema } from "shared";

const ApiMetric = mongoose.model("ApiMetric", apiMetricSchema);

export default ApiMetric;

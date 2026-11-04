import mongoose from "mongoose";
export async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb+srv://whyrush711_db_user:5RV5dJlWI5DAr79J@edunexa-cluster.vtn8zrg.mongodb.net/";
  await mongoose.connect(uri);
  console.log("MongoDB connected");
}

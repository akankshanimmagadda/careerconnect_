import mongoose from "mongoose"; //just mongoose import!
import dotenv from "dotenv"
dotenv.config()

//Database connection here!
const isSrvLookupError = (error) => {
   const message = (error?.message || "").toLowerCase();
   return message.includes("querysrv") || message.includes("enotfound") || message.includes("eservfail") || message.includes("econnrefused");
};

const connectWithUri = async (uri) => {
   await mongoose.connect(uri, {
      dbName: "Job_Portal",
      serverSelectionTimeoutMS: 15000,
   });
};

const dbConnection = async () => {
   const primaryUri = process.env.DB_URL;
   const directUri = process.env.DB_URL_DIRECT;

   try {
      await connectWithUri(primaryUri);
      console.log("MongoDB Connected Sucessfully !");
      return;
   } catch (error) {
      console.log(`Failed to connect via DB_URL: ${error}`);

      if (directUri && isSrvLookupError(error)) {
         try {
            await connectWithUri(directUri);
            console.log("MongoDB Connected Sucessfully via direct Atlas URI!");
            return;
         } catch (directError) {
            console.log(`Failed to connect via DB_URL_DIRECT: ${directError}`);
         }
      }
   }
};

export default dbConnection;
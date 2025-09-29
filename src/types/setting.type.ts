import mongoose from "mongoose";

export interface IBankConfig {
  _id?: mongoose.Types.ObjectId;
  name: string;
  image: string;
};

export interface IBankConfigResponse {
  id: string;
  name: string;
  image: string;
};
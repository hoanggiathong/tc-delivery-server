import mongoose from 'mongoose';

export interface IBankConfig {
  _id?: mongoose.Types.ObjectId;
  name: string;
  code: string;
  image: string;
}

export interface IBankConfigResponse {
  id: string;
  name: string;
  code: string;
  image: string;
}

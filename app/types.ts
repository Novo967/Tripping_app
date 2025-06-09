// types.ts

export type RootStackParamList = {
  Home: undefined;
  Profile: undefined;
  OtherUserProfile: { uid: string }; // קבלת מזהה המשתמש
};

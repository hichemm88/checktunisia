import { VerificationResult } from '../api/types';

export type HomeStackParamList = {
  HomeMain: undefined;
  AlertDetail: { alertId: string };
};

export type VerifyStackParamList = {
  VerifyMain: undefined;
  MrzScan: undefined;
  ManualEntry: undefined;
  Result: { result: VerificationResult };
};

export type EstablishmentsStackParamList = {
  EstablishmentsList: undefined;
  EstablishmentDetail: { establishmentId: string };
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Activity: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  VerifyTab: undefined;
  EstablishmentsTab: undefined;
  SettingsTab: undefined;
};

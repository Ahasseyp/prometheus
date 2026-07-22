export type Timestamps = {
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

/**
 * Creates timestamp fields, defaulting omitted values to the current date.
 */
export function createTimestamps(params?: { createdAt?: Date; updatedAt?: Date }): Timestamps {
  const now = new Date();
  return {
    createdAt: params?.createdAt ?? now,
    updatedAt: params?.updatedAt ?? now,
  };
}

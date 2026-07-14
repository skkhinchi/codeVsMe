export type AuthUser = {
  name: string;
  email: string;
  picture: string;
  sub: string;
};

export type GoogleJwtPayload = {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
};

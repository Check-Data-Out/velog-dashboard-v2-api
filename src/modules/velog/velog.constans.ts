export const VELOG_API_URL = 'https://v3.velog.io/graphql';
export const VELOG_QUERIES = {
  LOGIN: `query currentUser {
      currentUser {
        id
        username
        email
        profile {
          thumbnail
        }
      }
    }`,
};

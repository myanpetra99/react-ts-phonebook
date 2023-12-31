import { gql } from "@apollo/client";

export const GET_CONTACT_DETAIL = gql`
  query GetContactDetail($id: Int!) {
    contact_by_pk(id: $id) {
      last_name
      id
      first_name
      created_at
      phones {
        id
        number
      }
    }
  }
`;

export const GET_CONTACTS = gql`
  query GetContactList(
    $distinct_on: [contact_select_column!]
    $limit: Int
    $offset: Int
    $order_by: [contact_order_by!]
    $where: contact_bool_exp
  ) {
    contact(
      distinct_on: $distinct_on
      limit: $limit
      offset: $offset
      order_by: $order_by
      where: $where
    ) {
      created_at
      first_name
      id
      last_name
      phones {
        number
      }
    }
  }
`;

export const GET_CONTACT_BY_NAME = gql`
query GetContactByFirstName($firstname: String!, $lastname: String!) {
  contact(
    where: { first_name: { _eq: $firstname }, last_name: { _eq: $lastname } }
  ) {
    created_at
    first_name
    id
    last_name
    phones {
      number
    }
  }
}
`;
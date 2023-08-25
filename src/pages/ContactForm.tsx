import "../App.css";
import { useState, useRef, useEffect } from "react";
import { css } from "@emotion/react";
import { useMutation, useQuery, useLazyQuery } from "@apollo/client";
import { GET_CONTACT_DETAIL, GET_CONTACT_BY_NAME } from "../graphql/query";
import { AiFillStar, AiOutlineStar } from "react-icons/ai";

import {
  EDIT_CONTACT,
  ADD_CONTACT,
  ADD_PHONE_NUMBER,
  DELETE_PHONE_BY_PK,
  EDIT_PHONE_NUMBER,
} from "../graphql/mutation";

type Contact = {
  id: number;
  name: string;
  number: string[];
};

type ContactFormProps = {
  mode: "add" | "edit";
  isVisible: boolean;
  toggleVisibility: () => void;
  contactId: number | null;
  updateContacts: (updatedContact: Contact) => void;
  throwError: (error: Error) => void;
  isFavorited: boolean;
  toggleTrueFavorite: () => void;
  toggleFalseFavorite: () => void;
};

function ContactForm({
  mode,
  isVisible,
  toggleVisibility,
  contactId,
  updateContacts,
  throwError,
  isFavorited,
  toggleTrueFavorite,
  toggleFalseFavorite,
}: ContactFormProps) {
  type PhoneNumber = {
    id: number | null;
    value: string;
  };

  const [isFavorite, setIsFavorite] = useState<boolean>(isFavorited);

  const removeFromFav = () => {
    toggleFalseFavorite();
    setIsFavorite(false);
  };

  const addToFav = () => {
    toggleTrueFavorite();
    setIsFavorite(true);
  };

  const [numbers, setNumbers] = useState<PhoneNumber[]>([
    { id: null, value: "" },
  ]);
  const [addContact] = useMutation(ADD_CONTACT, {
    refetchQueries: ["GetContactList"],
  });
  const [oldFirstName, setOldFirstName] = useState<string>("");
  const [oldLastName, setOldLastName] = useState<string>("");

  const [editPhoneNumber] = useMutation(EDIT_PHONE_NUMBER);
  const [deletePhoneByPk] = useMutation(DELETE_PHONE_BY_PK, {
    refetchQueries: ["GetContactList"],
  });
  const [deletedNumbers, setDeletedNumbers] = useState<string[]>([]);
  const [addPhoneNumber] = useMutation(ADD_PHONE_NUMBER, {
    refetchQueries: ["GetContactList"],
  });
  const [oldNumbers, setOldNumbers] = useState<PhoneNumber[]>([
    { id: null, value: "" },
  ]);
  const [dataValidation, setDataValidation] = useState<boolean>(true);

  const {
    data: contactDetailData,
    loading,
    error: QueryError,
    refetch,
  } = useQuery(GET_CONTACT_DETAIL, {
    variables: { id: contactId },
    skip: mode !== "edit",
  });

  const [editContact] = useMutation(EDIT_CONTACT);
  const [checkExistingName] = useLazyQuery(GET_CONTACT_BY_NAME, {
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.contact.length > 0) {
        console.log("existing name");
        console.log(data.contact);
        throwError(new Error("A contact with the same name already exists."));
      }
    },
  });

  const firstNameRef = useRef<HTMLInputElement | null>(null);
  const lastNameRef = useRef<HTMLInputElement | null>(null);

  const hasSpecialCharacters = (string: string) => {
    const regex = /^[A-Za-z\s'0-9-]+$/;
    return !regex.test(string);
  };

  const checkIfNumberOnly = (string: string) => {
    const regex = /^[0-9]+$/;
    return regex.test(string);
  };

  const validateContactNumber = (number: string) => {
    if (!checkIfNumberOnly(number)) {
      throwError(new Error("The number can only contain numbers."));
      return false;
    }
    return true;
  };

  const validateContactName = (firstName: string, lastName: string) => {
    // Check if the name has special characters
    if (hasSpecialCharacters(firstName) || hasSpecialCharacters(lastName)) {
      throwError(new Error("The name cannot contain special characters."));
      return false;
    }
    return true;
  };

  function checkExistingNameHandler(firstname: string, lastname: string) {
    return new Promise<void>((resolve, reject) => {
      checkExistingName({
        variables: {
          firstname: firstname,
          lastname: lastname,
        },
        onCompleted: (data) => {
          if (data && data.contact.length > 0) {
            throwError(
              new Error("A contact with the same name already exists.")
            );
            reject(new Error("A contact with the same name already exists."));
          } else {
            resolve();
          }
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  }

  const handleSave = async () => {
    const firstName =
      firstNameRef && firstNameRef.current ? firstNameRef.current["value"] : "";
    const lastName =
      lastNameRef && lastNameRef.current ? lastNameRef.current["value"] : "";
    if (!validateContactName(firstName, lastName)) {
      return;
    }

    await checkExistingNameHandler(firstName, lastName);

    const phoneObjects = numbers.map((num) => ({ number: num.value }));

    for (const phone of phoneObjects) {
      if (!validateContactNumber(phone.number)) {
        return;
      }
    }

    try {
      const { data } = await addContact({
        variables: {
          first_name: firstName,
          last_name: lastName,
          phones: phoneObjects,
        },
      });
      console.log(data);
      toggleVisibility();
      resetForm();
    } catch (error) {
      console.error("Error editing phone:", error);
      if (
        typeof error === "string" &&
        error.includes('unique constraint "phone_number_key"')
      ) {
        throwError(new Error("Number has been used by another contact"));
        return;
      } else if (error instanceof Error) {
        if (error.message.includes('unique constraint "phone_number_key"')) {
          throwError(new Error("Number has been used by another contact"));
          return;
        } else {
          throwError(error);
        }
      } else {
        console.error("Error adding contact:", error);
        throwError(error as Error);
        return;
      }
    }
  };

  useEffect(() => {
    setIsFavorite(isFavorited);
  }, [isFavorited]);

  useEffect(() => {
    if (QueryError) {
      console.error("Error fetching contact detail:", QueryError);
      throwError(QueryError as Error);
    }
  }, [QueryError]);

  const resetForm = () => {
    if (firstNameRef.current && lastNameRef.current) {
      firstNameRef.current.value = "";
      lastNameRef.current.value = "";
    }
    setDataValidation(true);
    setNumbers([{ id: null, value: "" }]);
  };

  const handleEditSave = async () => {
    const firstName =
      firstNameRef && firstNameRef.current ? firstNameRef.current["value"] : "";
    const lastName =
      lastNameRef && lastNameRef.current ? lastNameRef.current["value"] : "";
    if (!validateContactName(firstName, lastName)) {
      return;
    }

    if (firstName !== oldFirstName || lastName !== oldLastName) {
      await checkExistingNameHandler(firstName, lastName);
    }

    //check if the contacts is not deleted in the database

    try {
      await editContact({
        variables: {
          id: contactId,
          _set: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      for (const number of deletedNumbers) {
        if (!validateContactNumber(number)) {
          return;
        }
        try {
          await deletePhoneByPk({
            variables: { contact_id: contactId, number: number },
          });
        } catch (error) {
          console.error("Error deleting phone:", error);
          throwError(error as Error);
          return;
        }
      }
      setDeletedNumbers([]);
    } catch (error) {
      console.error("Error editing contact:", error);
      throwError(error as Error);
      return;
    }

    const numbersToAdd = numbers.filter((num) => num.id === null);
    for (const number of numbersToAdd) {
      try {
        await addPhoneNumber({
          variables: {
            contact_id: contactId,
            number: number.value,
          },
        });
      } catch (error) {
        console.error("Error adding phone number:", error);
        throwError(error as Error);
        return;
      }
      console.log("added new phone", number.value);
    }

    const numbersToEdit = numbers.filter((num) => num.id !== null);
    const oldNumbersToEdit = oldNumbers.filter((oldNum) =>
      numbersToEdit.some((num) => num.id === oldNum.id)
    );
    if (numbersToEdit.length !== oldNumbersToEdit.length) {
      console.error("Mismatch in number lengths!");
      return;
    }

    for (let i = 0; i < numbersToEdit.length; i++) {
      const currentNumber = numbersToEdit[i];
      const originalNumber = oldNumbersToEdit[i];
      //only update if the number is different (healthy request)
      if (originalNumber.value !== currentNumber.value) {
        try {
          await editPhoneNumber({
            variables: {
              pk_columns: {
                number: originalNumber.value,
                contact_id: contactId,
              },
              new_phone_number: currentNumber.value,
            },
          });

          console.log(
            "edited from :",
            originalNumber.value,
            " to:",
            currentNumber.value
          );
        } catch (error) {
          console.error("Error editing phone:", error);
          if (
            typeof error === "string" &&
            error.includes('unique constraint "phone_number_key"')
          ) {
            throwError(new Error("Number has been used by another contact"));
            return;
          } else if (error instanceof Error) {
            if (
              error.message.includes('unique constraint "phone_number_key"')
            ) {
              throwError(new Error("Number has been used by another contact"));
              return;
            } else {
              throwError(error);
            }
          } else {
            throwError(new Error("An unknown error occurred"));
            return;
          }
        }
      }
    }

    //rechecking data
    const refetchedData = await refetch();
    console.log(refetchedData);

    if (refetchedData && refetchedData.data) {
      if (refetchedData.data.contact_by_pk) {
        const fetchedContact = refetchedData.data.contact_by_pk;

        // Additional checks
        if (
          !fetchedContact.id ||
          !fetchedContact.first_name ||
          !fetchedContact.last_name ||
          !fetchedContact.phones
        ) {
          console.error(
            "The fetched contact has missing properties:",
            fetchedContact
          );
          return;
        }

        const updatedContact = {
          id: fetchedContact.id,
          name: `${fetchedContact.first_name} ${fetchedContact.last_name}`,
          number: fetchedContact.phones.map(
            (phone: { number: string }) => phone.number
          ),
        };

        updateContacts(updatedContact);
      } else {
        throwError(
          new Error("Failed to edit contact, it may has been deleted")
        );
        setDataValidation(false);
        return;
      }
    } else {
      console.error("Failed to fetch the updated contact after edit.");
      return;
    }

    toggleVisibility();
  };

  const addNumberInput = () => {
    setNumbers((prevNumbers) => [...prevNumbers, { id: null, value: "" }]);
  };

  const handleNumberChange = (id: number, value: string) => {
    setNumbers((prevNumbers) =>
      prevNumbers.map((num, idx) => (idx === id ? { ...num, value } : num))
    );
  };

  const deleteNumberInput = (index: number) => {
    const deletedPhone = numbers[index];
    if (deletedPhone.value) {
      setDeletedNumbers((prevNumbers) => [...prevNumbers, deletedPhone.value]);
    }
    setNumbers((prevNumbers) => prevNumbers.filter((_, idx) => idx !== index));
  };

  const showForm = css`
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    transform: translateY(0);
    transition: transform 0.5s ease;
    z-index: 999;
  `;

  const hideForm = css`
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    transform: translateY(500%);
    transition: transform 0.5s ease;
    z-index: 999;
  `;

  useEffect(() => {
    if (mode === "edit" && contactDetailData) {
      console.log("edit mode");
      if (contactDetailData.contact_by_pk == null) {
        throwError(new Error("Contact not found, it may has been deleted"));
        setDataValidation(false);
        return;
      }
      const fetchedContact = contactDetailData.contact_by_pk;
      firstNameRef.current!.value = fetchedContact.first_name;
      lastNameRef.current!.value = fetchedContact.last_name;
      setNumbers(
        fetchedContact.phones.map((phone: { number: string; id: number }) => ({
          id: phone.id,
          value: phone.number,
        }))
      );
      setOldNumbers(
        fetchedContact.phones.map((phone: { number: string; id: number }) => ({
          id: phone.id,
          value: phone.number,
        }))
      );
      setOldFirstName(fetchedContact.first_name);
      setOldLastName(fetchedContact.last_name);
      setDataValidation(true);
    } else {
      resetForm();
    }
  }, [isVisible, contactDetailData]);

  if (loading) return <p>Loading...</p>;

  return (
    <div
      className="contact-form"
      css={isVisible && dataValidation ? showForm : hideForm}
    >
      <img
        className="contact-image detail-image"
        src={`https://ui-avatars.com/api/?name=${firstNameRef.current?.value} ${lastNameRef.current?.value}&background=random&rounded=true&size=128}`}
      />
      <div className="form-detail-input">
        <div className="input-with-icon">
          <input
            type="text"
            ref={firstNameRef}
            id="firstname"
            name="firstname"
            placeholder="First Name"
          />
        </div>
        <div className="input-with-icon">
          <input
            type="text"
            ref={lastNameRef}
            id="lastname"
            name="lastname"
            placeholder="Last Name"
          />
        </div>
        <div>
          <div className="container-number">
            {numbers.map((number, index) => (
              <div className="contact-number-list" key={index}>
                <div className="input-with-icon">
                  <input
                    type="tel"
                    name="number"
                    placeholder="number"
                    required
                    value={number.value}
                    onChange={(e) => handleNumberChange(index, e.target.value)}
                  />
                  {numbers.length !== 1 && (
                    <span
                      className="delete-icon"
                      onClick={() => deleteNumberInput(index)}
                    >
                      &#10005;
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div className="add-more-number sub-text" onClick={addNumberInput}>
              Add more number
            </div>
            <div className="form-action-button">
              {isFavorite ? (
                <button
                  className="remove-favorite-button"
                  onClick={removeFromFav}
                >
                  <AiFillStar />
                </button>
              ) : (
                <button className="add-favorite-button" onClick={addToFav}>
                  <AiOutlineStar />
                </button>
              )}
              <button
                className="cancel-button"
                onClick={() => {
                  toggleVisibility();
                }}
              >
                Cancel
              </button>
              <button
                className="save-button"
                onClick={mode === "edit" ? handleEditSave : handleSave}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactForm;

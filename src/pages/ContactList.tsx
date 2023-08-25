import "../App.css";
import { useState, useEffect } from "react";
import { css } from "@emotion/react";
import ContactForm from "./ContactForm";
import { useLongPress } from "use-long-press";
import { useQuery, useMutation } from "@apollo/client";
import MiniPopup from "../components/miniPopup";
import  { DELETE_CONTACT } from "../graphql/mutation";
import { GET_CONTACTS } from "../graphql/query";
import ErrorPopup from "../components/errorPopup";

const inputStyle = css`
  padding: 10px;
  margin: 10px;
  width: calc(100% - 30px);
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: white;
  transition: all 0.5s ease;
`;

function ContactList() {
  const [favcontacts, setfavContacts] = useState<Contact[]>(() => {
    const localFavContacts = localStorage.getItem("favcontacts");
    return localFavContacts ? JSON.parse(localFavContacts) : [];
});

const [contacts, setContacts] = useState<Contact[]>(() => {
    const localContacts = localStorage.getItem("contacts");
    let contactsList = localContacts ? JSON.parse(localContacts) : [];
    
    // Filter out contacts that are in favcontacts
    contactsList = contactsList.filter((contact: { id: number; }) => !favcontacts.some(favContact => favContact.id === contact.id));

    return contactsList;
});
  const [error, setError] = useState<string>("");
  const [searchValue, setSearchValue] = useState<string>("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [contactType, setContactType] = useState<"normal" | "favorite">(
    "normal"
  );
  const [selectedContact, setSelectedContact] = useState<number>(0);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [contactOffset, setContactOffset] = useState<number>(0);

  const [editingContact, setEditingContact] = useState<number | null>(null);
  const [deleteContact] = useMutation(DELETE_CONTACT);

  const handleAddContact = () => {
    setFormMode("add");
    setEditingContact(null);
    setShowNewContactForm(true);
    console.log(showNewContactForm);
    setShowPopup(false);
  };

  const handleDeleteContact = async (contactId: number) => {
    try {
      const { data } = await deleteContact({
        variables: {
          id: contactId,
        },
      });
       // Remove contact from local contacts state
       const updatedContacts = contacts.filter(contact => contact.id !== contactId);
       setContacts(updatedContacts);
 
       // Remove contact from local favcontacts state
       const updatedFavContacts = favcontacts.filter(favcontact => favcontact.id !== contactId);
       setfavContacts(updatedFavContacts);
 
       // Update the contacts list in local storage
       localStorage.setItem("contacts", JSON.stringify(updatedContacts));
 
       // Update the favcontacts list in local storage
       localStorage.setItem("favcontacts", JSON.stringify(updatedFavContacts));
      console.log(data);
      refetch();  

    console.log("Deleted Contact ID:", contactId);
    } catch (error) {
      console.log(error);
    }

    setShowPopup(false);
  };

  const editContacts = (contactId: number) => {
    setEditingContact(contactId);
    setFormMode("edit");
    setShowNewContactForm(true);
    setShowPopup(false);
  };

  const { data, loading, fetchMore, refetch, error:QueryError  } = useQuery(GET_CONTACTS, {
    variables: {
      limit: 10,
      offset: 0,
      order_by: { created_at: "desc" },
    },
    notifyOnNetworkStatusChange: true,
  });

  type Contact = {
    id: number;
    name: string;
    number: string[];
  };

  const addToFav = (id: number) => {
    const contactToAdd = contacts.find((contact) => contact.id === id);

    if (contactToAdd) {
      setfavContacts((prevContacts) => [...prevContacts, contactToAdd]);

      setContacts((prevContacts) =>
        prevContacts.filter((contact) => contact.id !== id)
      );
    }
    setShowPopup(false);
  };

  const removeFromFav = (id: number) => {
    const contactToRemove = favcontacts.find((contact) => contact.id === id);

    if (contactToRemove) {
      setfavContacts((prevContacts) =>
        prevContacts.filter((contact) => contact.id !== id)
      );

      setContacts((prevContacts) => [...prevContacts, contactToRemove]);
    }
    setShowPopup(false);
    refetch();
  };

  const bindFav = useLongPress((props, contactId) => {
    setPopupPosition({ x: props.clientX, y: props.clientY + 50 });
    console.log("Fav Contact ID:", contactId.context);
    setSelectedContact(contactId.context as number);
    console.log("Selected Contact:", selectedContact);
    setShowPopup(true);
    setContactType("favorite");
  });

  const bindReg = useLongPress((props, contactId) => {
    setPopupPosition({ x: props.clientX, y: props.clientY + 50 });
    console.log("Regular Contact ID:", contactId.context);
    setSelectedContact(contactId.context as number);
    console.log("Selected Contact:", selectedContact);
    setShowPopup(true);
    setContactType("normal");
  });

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  const filteredFavContacts = favcontacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  useEffect(() => {
    const closePopup = (e: MouseEvent) => {
      if (!e.target) return;
      if ((e.target as HTMLElement).closest(".mini-popup")) return;

      setShowPopup(false);
    };

    if (showPopup) {
      document.addEventListener("mousedown", closePopup);
    }

    return () => {
      document.removeEventListener("mousedown", closePopup);
    };
  }, [showPopup]);

  useEffect(() => {
    if (!loading && data) {
      const fetchedContacts = data.contact.map(
        (contact: {
          id: number;
          first_name: string;
          last_name: string;
          phones: { number: string }[];
        }) => ({
          id: contact.id,
          name: `${contact.first_name} ${contact.last_name}`,
          number: contact.phones.map(
            (phone: { number: string }) => phone.number
          ),
        })
      )
      .filter((contact: { id: number; }) => !favcontacts.some(favContact => favContact.id === contact.id)); // Filter out favorited contacts

      setContacts(fetchedContacts);
      setContactOffset(fetchedContacts.length);
    }
  }, [data, loading, contactOffset, favcontacts]);

  useEffect(() => {
    const fetchMoreContacts = () => {
      if (!loading && data) {
        console.log("fetching more");
        console.log(contactOffset);
        fetchMore({
          variables: {
            offset: contactOffset,
          },
          updateQuery: (prev, { fetchMoreResult }) => {
            if (!fetchMoreResult) return prev;
    
            const newContacts = fetchMoreResult.contact.filter(
              (newContact: { id: number; }) => !contacts.some(contact => contact.id === newContact.id)
            );
    
            console.log(newContacts.length);
            setContactOffset(newContacts.length);
    
            return Object.assign({}, prev, {
              contact: [...prev.contact, ...newContacts],
            });
          },
        });
      }
    };
    

    const handleScroll = () => {
      // If user scrolls to the bottom
      if (
        window.innerHeight + document.documentElement.scrollTop + 1 >=
        document.documentElement.offsetHeight &&
        !loading
      ) {
        fetchMoreContacts();
        return;
      }
    };
  
    window.addEventListener("scroll", handleScroll);
  
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, contactOffset, data, fetchMore]);
  
  useEffect(() => {
    localStorage.setItem("contacts", JSON.stringify(contacts));
}, [contacts]);

useEffect(() => {
    localStorage.setItem("favcontacts", JSON.stringify(favcontacts));
}, [favcontacts]);

const handleError = (error: Error) => {
  setError(error.message);
  setTimeout(() => {
    setError("");
  }
  , 3000);
};

const updateLocalContacts = (updatedContact: Contact) => {

  // Update favcontacts list if the contact exists
  const updatedFavContactsList = favcontacts.map(contact =>
    contact.id === updatedContact.id ? updatedContact : contact
  );
  setfavContacts(updatedFavContactsList);
  localStorage.setItem("favcontacts", JSON.stringify(updatedFavContactsList));
};


  return (
    <div>
      {showPopup && (
        <MiniPopup
          contactType={contactType}
          onAddToFavorites={() => addToFav(selectedContact)}
          onRemoveFromFavorites={() => removeFromFav(selectedContact)}
          editContacts={() => editContacts(selectedContact)}
          deleteContact={() => handleDeleteContact(selectedContact)}
          position={popupPosition}
        />
      )}

      <div className="title">Contact</div>
      <p className="sub-text">There are {filteredFavContacts.length+filteredContacts.length} contacts on your screen</p>

      <div className="action-container">
        <div
          className="search-icon"
          onClick={() => setIsSearchVisible((prev) => !prev)}
        >
          <img src="https://img.icons8.com/ios-filled/50/000000/search--v1.png" />
        </div>
        <input
          css={
            isSearchVisible
              ? inputStyle
              : css`
                  padding: 0;
                  margin: 0;
                  width: 0;
                  border: 0px solid #ccc;
                  transition: all 0.5s ease;
                `
          }
          type="text"
          placeholder="Search contacts..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />

        <div className="add-icon" onClick={() => handleAddContact()}>
          <img src="https://img.icons8.com/ios-filled/50/000000/plus-math.png" />
        </div>
      </div>
      <div
        css={
          favcontacts.length != 0
            ? css`
                display: block;
              `
            : css`
                display: none;
              `
        }
      >
        <div className="sub-text"> Favorites &#9733;</div>
        <div className="favorites-contact-container">
          {filteredFavContacts.map((contact) => (
            <div key={contact.id} className="contact" {...bindFav(contact.id)}>
              <img
                className="contact-image"
                src={`https://ui-avatars.com/api/?name=${contact.name}&background=random`}
              />
              <div className="contact-detail">
                <div className="contact-name">{contact.name}</div>
                <div className="contact-number">
                  {contact.number[0]}
                  {contact.number.length > 1 && (
                    <span className="sub-text">
                      {" "}
                      ( .. {contact.number.length - 1} more){" "}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="contact-container">
        {filteredContacts.map((contact) => (
          <div key={contact.id} className="contact" {...bindReg(contact.id)}>
            <img
              className="contact-image"
              src={`https://ui-avatars.com/api/?name=${contact.name}&background=random`}
            />
            <div className="contact-detail">
              <div className="contact-name">{contact.name}</div>
              <div className="contact-number">
                {contact.number[0]}
                {contact.number.length > 1 && (
                  <span className="sub-text">
                    {" "}
                    ( .. {contact.number.length - 1} more){" "}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <ContactForm
        isVisible={showNewContactForm}
        toggleVisibility={() => setShowNewContactForm((prev) => !prev)}
        mode={formMode}
        contactId={editingContact}
        updateContacts={updateLocalContacts}
        throwError={handleError}
      />

      <ErrorPopup message={String(error)|| String(QueryError)} isVisible={error!=""} />


      {loading && contactOffset==0 && <div>Loading...</div>}
      <br></br>
    </div>
  );
}

export default ContactList;

import React, { useEffect, useState } from 'react';
import { db } from '../firebase'; // Assurez-vous que ce chemin est correct
import { collection, doc, getDocs, getDoc, query, where, updateDoc, setDoc, getCountFromServer, deleteDoc } from 'firebase/firestore';
import { BrowserRouter as Router } from 'react-router-dom';

const AdminPage = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [certifications, setCertifications] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeChannelsCount, setActiveChannelsCount] = useState(0);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [creator, setCreator] = useState(null);
  const [allowedUsersDetails, setAllowedUsersDetails] = useState([]); // Nouvel état pour les détails des utilisateurs autorisés

  // Vérifier si l'utilisateur est l'administrateur
//   useEffect(() => {
//     if (!user || user.email !== "adimarcel67@gmail.com") {
//       return;
//     }
//   }, [user]);

  // Récupérer la liste des utilisateurs depuis Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersCollection = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollection);
        const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersList);
        setFilteredUsers(usersList); // Initialement, tous les utilisateurs sont filtrés
      } catch (error) {
        console.error("Erreur lors de la récupération des utilisateurs : ", error);
      }
    };

    fetchUsers();
  }, []);

  // Filtrer les utilisateurs en fonction du terme de recherche
  useEffect(() => {
    const filtered = users.filter(user =>
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  // Récupérer les informations détaillées d'un utilisateur sélectionné
  useEffect(() => {
    const fetchUserDetails = async (userId) => {
      try {
        const userDoc = doc(db, "users", userId);
        const userSnapshot = await getDoc(userDoc);
        const userData = userSnapshot.data();
        setSelectedUser(userData);

        // Récupérer les certifications de l'utilisateur
        if (userData && userData.email) {
          const certCollection = doc(db, "certificated", userData.email);
          const certSnapshot = await getDoc(certCollection);
          setCertifications(certSnapshot.data());
        } else {
          setCertifications(null);
        }

        // Compter les canaux actifs créés par l'utilisateur
        if (userData && userData.uid) {
          const channelsCollection = collection(db, "channels");
          const q = query(channelsCollection, where("creatorId", "==", userData.uid));
          const channelsSnapshot = await getDocs(q);
          setActiveChannelsCount(channelsSnapshot.size);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des détails de l'utilisateur : ", error);
      }
    };

    if (selectedUser && selectedUser.id) {
      fetchUserDetails(selectedUser.id);
    }
  }, [selectedUser]);

  // Récupérer la liste des canaux depuis Firestore
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const channelsCollection = collection(db, "channels");
        const channelsSnapshot = await getDocs(channelsCollection);
        const channelsList = channelsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setChannels(channelsList);
      } catch (error) {
        console.error("Erreur lors de la récupération des canaux : ", error);
      }
    };

    fetchChannels();
  }, []);

  // Récupérer les détails d'un canal sélectionné
  useEffect(() => {
    const fetchChannelDetails = async (channelId) => {
      try {
        const channelDoc = doc(db, "channels", channelId);
        const channelSnapshot = await getDoc(channelDoc);
        const channelData = channelSnapshot.data();
        setSelectedChannel(channelData);

        // Compter les messages dans le canal
        if (channelId) {
          const messagesCollection = collection(db, "channels", channelId, "messages");
          const messagesSnapshot = await getCountFromServer(messagesCollection);
          setSelectedChannel(prevChannel => ({
            ...prevChannel,
            messageCount: messagesSnapshot.data().count
          }));
        }

        // Récupérer les informations du créateur du canal
        if (channelData && channelData.creatorId) {
          const creatorDoc = doc(db, "users", channelData.creatorId);
          const creatorSnapshot = await getDoc(creatorDoc);
          setCreator(creatorSnapshot.data());
        }

        // Récupérer les détails des utilisateurs autorisés
        if (channelData && channelData.allowedUsers && channelData.allowedUsers.length > 0) {
          const allowedUsers = await Promise.all(
            channelData.allowedUsers.map(async (userId) => {
              const userDoc = doc(db, "users", userId);
              const userSnapshot = await getDoc(userDoc);
              return { id: userId, ...userSnapshot.data() };
            })
          );
          setAllowedUsersDetails(allowedUsers);
        } else {
          setAllowedUsersDetails([]);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des détails du canal : ", error);
      }
    };

    if (selectedChannel && selectedChannel.id) {
      fetchChannelDetails(selectedChannel.id);
    }
  }, [selectedChannel]);

  // Fonction pour mettre à jour ou créer les certifications dans Firestore
  const updateCertifications = async () => {
    if (selectedUser && selectedUser.email && certifications) {
      try {
        const certDoc = doc(db, "certificated", selectedUser.email);

        // Vérifier si le document de certifications existe
        const certSnapshot = await getDoc(certDoc);

        if (certSnapshot.exists()) {
          // Mettre à jour le document si il existe
          await updateDoc(certDoc, certifications);
        } else {
          // Créer un nouveau document si il n'existe pas
          await setDoc(certDoc, certifications);
        }
        alert("Certifications mises à jour avec succès !");
      } catch (error) {
        console.error("Erreur lors de la mise à jour des certifications : ", error);
        alert("Erreur lors de la mise à jour des certifications.");
      }
    }
  };

  // Fonction pour gérer les changements dans les champs de certification
  const handleCertificationChange = (e) => {
    const { name, value } = e.target;
    setCertifications(prevCertifications => ({
      ...prevCertifications,
      [name]: value === 'Oui'
    }));
  };

  // Fonction pour supprimer un canal
  const deleteChannel = async () => {
    if (selectedChannel) {
      const confirmed = window.confirm("Êtes-vous sûr de vouloir supprimer ce canal ? Cette action est irréversible.");
      if (confirmed) {
        try {
          await deleteDoc(doc(db, "channels", selectedChannel.id));
          alert("Canal supprimé avec succès !");
          // Réinitialiser les détails du canal sélectionné après suppression
          setSelectedChannel(null);
          // Mettre à jour la liste des canaux
          const updatedChannels = channels.filter(channel => channel.id !== selectedChannel.id);
          setChannels(updatedChannels);
        } catch (error) {
          console.error("Erreur lors de la suppression du canal : ", error);
          alert("Erreur lors de la suppression du canal.");
        }
      }
    }
  };

  const getColor = (value) => {
    return value === 'Oui' ? 'green' : 'red';
  };

  return (
    <div className="admin-page min-h-screen p-6 flex flex-col lg:flex-row">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>

      {/* Liste des utilisateurs */}
      <div className="flex-1 bg-white rounded-lg shadow-md p-4 lg:w-1/3 lg:mr-6 mb-6 lg:mb-0 h-auto flex flex-col">
        <h2 className="text-xl font-semibold mb-2">
          Liste des utilisateurs ({filteredUsers.length})
        </h2>
        {/* Barre de recherche */}
        <input
          type="text"
          placeholder="Rechercher par nom ou email"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4 p-2 border rounded w-full"
        />
        <div className="overflow-y-auto max-h-96">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center space-x-3 p-2 hover:bg-gray-200 cursor-pointer"
              onClick={() => setSelectedUser(user)}
            >
              <img src={user.photoURL} alt="Profile" className="h-10 w-10 rounded-full" />
              <p>{user.displayName || "Sans nom"}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Détails de l'utilisateur sélectionné */}
      <div className="flex-1 bg-white rounded-lg shadow-md p-4 lg:w-1/3 lg:mr-6 mb-6 lg:mb-0 h-auto flex flex-col">
        {selectedUser ? (
          <div className="flex flex-col h-full">
            <h2 className="text-2xl font-bold mb-4">{selectedUser.displayName}</h2>
            <img src={selectedUser.photoURL} alt="Profile" className="h-20 w-20 rounded-full mb-4" />
            <p><strong>Email:</strong> {selectedUser.email}</p>
            <p><strong>Pseudo:</strong> {selectedUser.displayName}</p>
            <p><strong>UID:</strong> {selectedUser.uid}</p>
            <p style={{ color: getColor(certifications ? (certifications.FurBoost ? 'Oui' : 'Non') : 'Non disponible') }}>
              <strong style={{ color: 'black' }}>FurBoost :</strong><b> {certifications ? (certifications.FurBoost ? 'Oui' : 'Non') : 'Non disponible'}</b>
            </p>
            <p style={{ color: getColor(certifications ? (certifications.isCertified ? 'Oui' : 'Non') : 'Non disponible') }}>
              <strong style={{ color: 'black' }}>isCertified :</strong><b> {certifications ? (certifications.isCertified ? 'Oui' : 'Non') : 'Non disponible'}</b>
            </p>
            <p style={{ color: getColor(certifications ? (certifications.isCertifiedAmi ? 'Oui' : 'Non') : 'Non disponible') }}>
              <strong style={{ color: 'black' }}>isCertifiedAmi :</strong><b> {certifications ? (certifications.isCertifiedAmi ? 'Oui' : 'Non') : 'Non disponible'}</b>
            </p>
            <p style={{ color: getColor(certifications ? (certifications.CreatorCertified ? 'Oui' : 'Non') : 'Non disponible') }}>
              <strong style={{ color: 'black' }}>isCreator :</strong><b> {certifications ? (certifications.CreatorCertified ? 'Oui' : 'Non') : 'Non disponible'}</b>
            </p>
            <p><strong>Nombre de channels actif:</strong> {activeChannelsCount}</p>
            <ul>
              {selectedUser.createdChannels?.map((channel) => (
                <li key={channel.id} className="mt-2">
                  <p><strong>Nom du channel:</strong> {channel.name}</p>
                  <p><strong>Date de création:</strong> {new Date(channel.creationDate).toLocaleDateString()}</p>
                  <p><strong>Mot de passe:</strong> {channel.password || "N/A"}</p>
                </li>
              ))}
            </ul>

            {/* Formulaire de modification des certifications */}
            <div className="mt-6 flex flex-col flex-grow">
              <h3 className="text-xl font-semibold mb-2">Modifier les certifications</h3>
              <label className="block mb-2">
                <strong>FurBoost:</strong>
                <select
                  name="FurBoost"
                  value={certifications?.FurBoost ? 'Oui' : 'Non'}
                  onChange={handleCertificationChange}
                  className="block w-full border rounded p-2 mt-1"
                >
                  <option value="Oui">Oui</option>
                  <option value="Non">Non</option>
                </select>
              </label>
              <label className="block mb-2">
                <strong>isCertifiedAmi:</strong>
                <select
                  name="isCertifiedAmi"
                  value={certifications?.isCertifiedAmi ? 'Oui' : 'Non'}
                  onChange={handleCertificationChange}
                  className="block w-full border rounded p-2 mt-1"
                >
                  <option value="Oui">Oui</option>
                  <option value="Non">Non</option>
                </select>
              </label>
              <label className="block mb-2">
                <strong>isCertified:</strong>
                <select
                  name="isCertified"
                  value={certifications?.isCertified ? 'Oui' : 'Non'}
                  onChange={handleCertificationChange}
                  className="block w-full border rounded p-2 mt-1"
                >
                  <option value="Oui">Oui</option>
                  <option value="Non">Non</option>
                </select>
              </label>
              <label className="block mb-2">
                <strong>isCreator:</strong>
                <select
                  name="CreatorCertified"
                  value={certifications?.CreatorCertified ? 'Oui' : 'Non'}
                  onChange={handleCertificationChange}
                  className="block w-full border rounded p-2 mt-1"
                >
                  <option value="Oui">Oui</option>
                  <option value="Non">Non</option>
                </select>
              </label>
              <button
                onClick={updateCertifications}
                className="mt-4 bg-blue-500 text-white py-2 px-4 rounded"
              >
                Enregistrer les modifications
              </button>
            </div>
          </div>
        ) : (
          <p>Sélectionnez un utilisateur pour voir les détails.</p>
        )}
      </div>

      {/* Liste des canaux */}
      <div className="flex-1 bg-white rounded-lg shadow-md p-4 lg:w-1/3 lg:mr-6 mb-6 lg:mb-0 h-auto flex flex-col">
        <h2 className="text-xl font-semibold mb-2">
          Liste des canaux ({channels.length})
        </h2>
        <div className="overflow-y-auto max-h-96">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="p-2 hover:bg-gray-200 cursor-pointer"
              onClick={() => setSelectedChannel(channel)}
            >
              <p>{channel.channelName}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Détails du canal sélectionné */}
      <div className="flex-1 bg-white rounded-lg shadow-md p-4 lg:w-1/3 lg:mr-6 mb-6 lg:mb-0 h-auto flex flex-col">
        {selectedChannel ? (
          <div className="flex flex-col h-full">
            <h2 className="text-2xl font-bold mb-4">{selectedChannel.channelName}</h2>
            <p><strong>Privé:</strong> {selectedChannel.isPrivate ? 'Oui' : 'Non'}</p>
            {selectedChannel.isPrivate && (
              <>
                <p><strong>Mot de passe:</strong> {selectedChannel.password || "N/A"}</p>
                <p><strong>Utilisateurs autorisés:</strong> {selectedChannel.allowedUsers?.join(', ') || "Aucun"}</p>
                {/* Détails des utilisateurs autorisés */}
              </>
            )}
            <p><strong>Nombre de messages:</strong> {selectedChannel.messageCount || 0}</p>
            
            {/* Informations sur le créateur */}
            {creator && (
              <div className="mt-4 flex items-center space-x-3">
                <p><strong>Créateur:</strong></p>
                <img src={creator.photoURL} alt="Creator" className="h-10 w-10 rounded-full" />
                <p>{creator.displayName || "Inconnu"}</p>
              </div>
            )}

            {/* Bouton de suppression du canal */}
            <button
              onClick={deleteChannel}
              className="mt-4 bg-red-500 text-white py-2 px-4 rounded"
            >
              Supprimer le canal
            </button>
          </div>
        ) : (
          <p>Sélectionnez un canal pour voir les détails.</p>
        )}
      </div>
    </div>
  );
};

export default AdminPage;

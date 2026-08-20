const mongoose = require('mongoose');
const Song = require('./models/Song');

const DEFAULT_SONGS = [
  { title: "Tum Hi Ho",        artist: "Arijit Singh",  difficulty: "Very Easy", options: ["Tum Hi Ho","Channa Mereya","Kabira","Raabta"],                          correctAnswer: "Tum Hi Ho",         audioUrl: "/audio/tum_hi_ho.mp3" },
  { title: "Shape of You",     artist: "Ed Sheeran",    difficulty: "Easy",      options: ["Perfect","Shape of You","Bad Habits","Shivers"],                          correctAnswer: "Shape of You",      audioUrl: "/audio/shape_of_you.mp3" },
  { title: "Chaleya",          artist: "Arijit Singh",  difficulty: "Easy",      options: ["Jhoome Jo Pathaan","Chaleya","Zinda Banda","Besharam Rang"],              correctAnswer: "Chaleya",           audioUrl: "/audio/chaleya.mp3" },
  { title: "Kesariya",         artist: "Arijit Singh",  difficulty: "Medium",    options: ["Deva Deva","Rasiya","Kesariya","Dance Ka Bhoot"],                         correctAnswer: "Kesariya",          audioUrl: "/audio/kesariya.mp3" },
  { title: "Blinding Lights",  artist: "The Weeknd",    difficulty: "Medium",    options: ["Save Your Tears","Starboy","The Hills","Blinding Lights"],                 correctAnswer: "Blinding Lights",   audioUrl: "/audio/blinding_lights.mp3" },
  { title: "Levitating",       artist: "Dua Lipa",      difficulty: "Medium",    options: ["Don't Start Now","Levitating","Physical","Dance The Night"],               correctAnswer: "Levitating",        audioUrl: "/audio/levitating.mp3" },
  { title: "Kala Chashma",     artist: "Amar Arshi",    difficulty: "Hard",      options: ["Kar Gayi Chull","Kala Chashma","Proper Patola","Abhi Toh Party"],          correctAnswer: "Kala Chashma",      audioUrl: "/audio/kala_chashma.mp3" },
  { title: "Despacito",        artist: "Luis Fonsi",    difficulty: "Hard",      options: ["Bailando","Mi Gente","Despacito","Echame La Culpa"],                        correctAnswer: "Despacito",         audioUrl: "/audio/despacito.mp3" },
  { title: "Kun Faya Kun",     artist: "A.R. Rahman",   difficulty: "Very Hard", options: ["Khwaja Mere Khwaja","Kun Faya Kun","Nadaan Parindey","Sadda Haq"],         correctAnswer: "Kun Faya Kun",      audioUrl: "/audio/kun_faya_kun.mp3" },
  { title: "Bohemian Rhapsody",artist: "Queen",          difficulty: "Very Hard", options: ["We Will Rock You","Don't Stop Me Now","Bohemian Rhapsody","Under Pressure"], correctAnswer: "Bohemian Rhapsody", audioUrl: "/audio/bohemian_rhapsody.mp3" },
];

async function loadSongs() {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB not connected');
    }
    let songs = await Song.find().sort({ createdAt: 1 }).lean();
    if (songs.length === 0) {
      console.log('No songs in DB — seeding defaults...');
      songs = await Song.insertMany(DEFAULT_SONGS);
    }
    // Normalise: map _id → id for the rest of the codebase
    return songs.map(s => ({ ...s, id: s._id.toString() }));
  } catch (err) {
    console.warn('MongoDB unavailable for loadSongs, using fallback JSON:', err.message);
    // Fallback to songs.json
    const fs   = require('fs');
    const path = require('path');
    const file = path.join(__dirname, 'songs.json');
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
    return DEFAULT_SONGS.map((s, i) => ({ ...s, id: i + 1 }));
  }
}

async function saveSongs(songsArray) {
  try {
    if (mongoose.connection.readyState !== 1) throw new Error('MongoDB not connected');
    // Bulk: delete all, reinsert. Simple for a small collection.
    await Song.deleteMany({});
    const inserted = await Song.insertMany(
      songsArray.map(({ id, _id, __v, ...rest }) => rest)
    );
    return inserted.map(s => ({ ...s.toObject(), id: s._id.toString() }));
  } catch (err) {
    console.warn('MongoDB unavailable for saveSongs, falling back to JSON:', err.message);
    const fs   = require('fs');
    const path = require('path');
    fs.writeFileSync(path.join(__dirname, 'songs.json'), JSON.stringify(songsArray, null, 2));
  }
}

async function deleteSongById(songId) {
  try {
    if (mongoose.connection.readyState !== 1) throw new Error('MongoDB not connected');
    await Song.findByIdAndDelete(songId);
  } catch (err) {
    console.warn('MongoDB unavailable for deleteSongById:', err.message);
  }
}

async function addSong(songData) {
  try {
    if (mongoose.connection.readyState !== 1) throw new Error('MongoDB not connected');
    const doc = await Song.create(songData);
    return { ...doc.toObject(), id: doc._id.toString() };
  } catch (err) {
    console.warn('MongoDB unavailable for addSong:', err.message);
    return null;
  }
}

module.exports = { loadSongs, saveSongs, deleteSongById, addSong };

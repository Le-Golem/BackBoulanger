const express = require('express');
const mongoose = require('mongoose')
const cors = require('cors');
var crypto = require('crypto')
const bodyParser = require('body-parser');

// Connexion à la base de données
mongoose
  .connect('mongodb://127.0.0.1:27017/Boulanger', {
    useNewUrlParser: true,
    useUnifiedTopology: true, // options qui évitent des warnings inutiles
  })
  .then(init); // Toutes les méthodes de mongoose renvoient des promesses


  function hashPassword(password) {
    const hash = crypto.createHash('sha1').update(password).digest('hex');
    return hash;
  }

async function init() {
  // Création d'un schéma
  const PatisserieSchema = new mongoose.Schema({
    name : String , 
    number : Number , 
    order : Number 
  });
  const StatsSchema = new mongoose.Schema({
    winAt : String,
    number : Number, 
    name : String
  })

  const UserSchema = new mongoose.Schema({
    id : String , 
    username : String , 
    password : String 
  })

  // Création d'un objet Modèle basé sur le schéma
  const PatisserieModel = mongoose.model("patisserie", PatisserieSchema);
  const UserModel = mongoose.model("users", UserSchema);
  const StatsModel = mongoose.model("statistiques" , StatsSchema)

  // Initialisation de l'app Express
  const app = express();
  app.use(bodyParser.json());
  app.use(cors());

  app.get("/Patisserie", async (req, res) => {
    try {
      // la méthode .find() du Modèle permet de récupérer les documents
      const docs = await PatisserieModel.find({});
      res.json(docs);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  app.put("/reset", async (req, res) => {
    try {
      await PatisserieModel.updateMany({}, { number: 10 });
      res.status(200).send("Réinitialisation réussie : les champs 'number' ont été mis à jour à 10 pour tous les documents");
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  

  app.get("/Random", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 2; // Récupère la valeur du paramètre "limit" ou utilise 2 par défaut
  
      let docs = await PatisserieModel.aggregate([
        {
          $match: {
            number: { $ne: 0 } // Exclure les documents ayant number = 0
          }
        },
        { $sample: { size: limit } }
      ]);
  
      if (docs.length < limit) {
        // Si le nombre de documents est inférieur à limit, répéter les documents pour atteindre le limit
        const remaining = limit - docs.length;
        const repeatedDocs = docs.slice(0, remaining);
        docs = docs.concat(repeatedDocs);
      }
      res.json(docs);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  app.post("/AjouteStat", async (req, res) => {
    try {
      const { winAt, winCount , name} = req.body;
      
      const newDocument = await StatsModel.create({ winAt , winCount , name });
  
      res.status(201).json(newDocument);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  app.delete("/Supprime", async (req, res) => {
    try {
      await StatsModel.deleteMany({});
      res.status(200).send("Toutes les entrées ont été supprimées");
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  
  
  
  app.patch("/tableau", async (req, res) => {
    try {
      const tableau = req.body.tableau;
      const id = new mongoose.Types.ObjectId(tableau._id);
      delete tableau._id;
  
      const doc = await PatisserieModel.findOne({ _id: id });
  
      if (doc) {
        Object.assign(doc, tableau); // Copie les propriétés du tableau dans le document existant
        await doc.save(); // Sauvegarde les modifications du document
        res.status(200).json(doc);
      } else {
        res.status(404).send("Aucun document trouvé");
      }
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  app.get("/user", async (req, res) => {
    try {
      // la méthode .find() du Modèle permet de récupérer les documents
      const docs = await UserModel.find({});
      res.json(docs);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  app.get("/stats", async (req, res) => {
    try {
      // la méthode .find() du Modèle permet de récupérer les documents
      const docs = await StatsModel.find({});
      res.json(docs);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  app.get("/auth/:username/:password", async (req, res) => {
    const username = req.params.username;
    const password = req.params.password;

    const hashedPassword = hashPassword(password);
    const user = await UserModel.findOne({username : username , password : hashedPassword})

      if (user) {
        if (user.password === hashedPassword) {
          res.send(`Authentification réussie - Nom d'utilisateur: ${username}, Mot de passe: ${hashedPassword}`);
        } else {
          res.status(401).send("Mot de passe incorrect");
        }
      } else {
        res.status(404).send("Aucun utilisateur trouvé");
      }
  });

  // Démarrage de l'app Express
  app.listen(3000, () =>
    console.log(`Server running at http://localhost:3000`)
  );
}
// Le modèle de construction d'un utilisateur
// Appel à mongoose
const mongoose = require('mongoose');
// Attribution du schéma de l'utilisateur
const Schema = mongoose.Schema;
// Define the schema for users
const userSchema = new Schema({
  username: {
  	type: String,
  	minlength: [3, 'Name is too short'],
  	maxlength: 25,
  	required: true,
  },
  lastname: {
  	type: String,
  	minlength: [3, 'Name is too short'],
  	maxlength: 25,
  	required: true,
  },
  firstname: {
  	type: String,
  	minlength: [3, 'Name is too short'],
  	maxlength: 25,
  	required: true,
  },
  honorific: {
  	type: String,
  	enum: ['Mr', 'Mrs', 'Ms', 'Dr'],
  	required: true
  },
  age: {
  	type: Number,
  	min: 0,
  	max: 140
  },
  address: {
  	road: {
  		type: String,
  		required: true
  	},
  	number: {
  		type: Number
  	},
  	city: {
  		type: String,
  		required: true
  	}
  },
});
// Create the model from the schema and export it
module.exports = mongoose.model('User', userSchema);
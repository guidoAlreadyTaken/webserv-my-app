// Le modèle de construction d'un utilisateur
// Appel à mongoose
const mongoose = require('mongoose');
// Attribution du schéma de l'utilisateur
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
// Define the schema for users
const userSchema = new Schema({
  username: {
  	type: String,
  	minlength: [3, 'Name is too short'],
  	maxlength: 25,
  	required: true,
    validate: {
      // Manually validate uniqueness to send a "pretty" validation error
      // rather than a MongoDB duplicate key error
      validator: validateUsernameUniqueness,
      message: 'User {VALUE} already taken'
    }
  },
  lastname: {
  	type: String,
  	minlength: [3, 'Name is too short'],
  	maxlength: 25,
  	required: true
  },
  firstname: {
  	type: String,
  	minlength: [3, 'Name is too short'],
  	maxlength: 25,
  	required: true
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
  		type: Number,
  	},
  	city: {
  		type: String,
  	}
  },
});

// Customize the behavior of person.toJSON() (called when using res.send)
userSchema.set('toJSON', {
  transform: transformJsonUser, // Modify the serialized JSON with a custom function
  virtuals: true // Include virtual properties when serializing documents to JSON
});


function validateUsernameUniqueness(value, callback) {
  var user = this;
  this.constructor.findOne().where('username').equals(value).exec(function(err, existingUser) {
    return(!err && (!existingUser || existingUser._id.equals(user._id)));
  });
}

function transformJsonUser(doc, json, options) {

  // Remove MongoDB _id & __v (there's a default virtual "id" property)
  delete json._id;
  delete json.__v;

  return json;
}




// Create the model from the schema and export it
module.exports = mongoose.model('User', userSchema);
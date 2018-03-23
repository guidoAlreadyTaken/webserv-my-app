// Appel à mongoose
var mongoose = require('mongoose');
// Attribution du schéma de l'utilisateur
const Schema = mongoose.Schema;
// Le modèle de construction d'une issue
const ObjectId = mongoose.Types.ObjectId;


/**
 * An Issue created by an user
*/
const issueSchema = new Schema({
  title: {
  	type: String,
  	minlength: [3, 'title is too short'],
  	maxlength: 25,
  	required: true,
  },
  imageUrl: {
    type: String,
    maxlength: [500, "ImageUrl: max 500 caractres"]
  },
  description: {
  	type: String,
  	minlength: [3, 'Description is too short'],
  	maxlength: 250,
  	required: true,
  },
  latitude: {
    type: Number,
    required: [true, "Il faut entrer une latitude"]
  },
  longitude: {
    type: Number,
    required: [true, "Il faut entrer une longitude"]
  },
  statement: {
  	type: String,
  	enum: ['Untouch', 'Done', 'Making'],
  },
  importance: {
    type: Boolean, //1 important , 0 pas important
    enum: ['High', 'Low'],
  },
  tags: {
    type: Array,
    items: [{type: String}]
  },
  creator: {
  	type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    /*
    validate: {
      // Validate that the creator is a valid ObjectId
      // and references an existing user
      validator: validateCreator
    }
    */
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Add a virtual "creatorHref" property:
 *
 * * "issue.creatorHref" will return the result of calling getCreatorHref with the issue as this
 * * "issue.creatorHref = value" will return the result of calling setCreatorHref with the issue as this and value as an argument
 */
issueSchema.virtual('creatorHref').get(getCreatorHref).set(setCreatorHref);

// Customize the behavior of movie.toJSON() (called when using res.send)
issueSchema.set('toJSON', {
  transform: transformJsonIssue, // Modify the serialized JSON with a custom function
  virtuals: true // Include virtual properties when serializing documents to JSON
});

/**
 * Given a user ID, ensures that it references an existing user.
 *
 * If it's not the case or the ID is missing or not a valid object ID,
 * the "creatorHref" property is invalidated instead of "creator".
 * (That way, the client gets an error on "creatorHref", which is the
 * property they sent, rather than "creator", which they don't know.)
 */
 
function validateCreator(value, callback) {
  if (!value && !this._creatorHref) {
    this.invalidate('creatorHref', 'Path `creatorHref` is required', value, 'required');
    return callback();
  } else if (!ObjectId.isValid(value)) {
    this.invalidate('creatorHref', 'Path `creatorHref` is not a valid User reference', this._creatorHref, 'resourceNotFound');
    return callback();
  }

  mongoose.model('User').findOne({ _id: ObjectId(value) }).exec(function(err, user) {
    if (err || !user) {
      this.invalidate('creatorHref', 'Path `creatorHref` does not reference a User that exists', this._creatorHref, 'resourceNotFound');
    }

    callback();
  });
}


/**
 * Returns the hyperlink to the issue's creator.
 * (If the creator has been populated, the _id will be extracted from it.)
 */
function getCreatorHref() {
  return `/users/${this.creator._id || this.creator}`;
}

/**
 * Sets the issue's creator from a user hyperlink.
 */
function setCreatorHref(value) {

  // Store the original hyperlink 
  this._creatorHref = value;

  // Remove "/users/" from the beginning of the value
  const userId = value.replace(/^\/users\//, '');

  if (ObjectId.isValid(userId)) {
    // Set the creator if the value is a valid MongoDB ObjectId
    this.creator = userId;
  } else {
    // Unset the creator otherwise
    this.creator = null;
  }
}

/**
 * Removes extra MongoDB properties from serialized issues,
 * and includes the creator's data if it has been populated.
 */
function transformJsonIssue(doc, json, options) {

  // Remove MongoDB _id & __v (there's a default virtual "id" property)
  delete json._id;
  delete json.__v;

  if (json.creator instanceof ObjectId) {
    // Remove the creator property by default (there's a "creatorHref" virtual property)
    delete json.creator;
  } else {
    // If the creator was populated, include it in the serialization
    json.creator = doc.creator.toJSON();
  }

  return json;
}

// Create the model from the schema and export it
module.exports = mongoose.model('Issue', issueSchema);
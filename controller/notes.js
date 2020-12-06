const mongoose = require("mongoose");
const Note = mongoose.model("Notes");

exports.saveNote = (req, res) => {
    console.log(req.body)
    try {
      const { text, title } = req.body;
      if(!text, !title) {
        return res.status(422).json({error: "Please add some text"});
      }
      const newNote = new Note({
        title,
        note: text,
        createdBy: req.user._id,
      });
      newNote.save()
      console.log('Note saved');
    } catch (error) {
      console.log(error)
    }
  }
  
exports.getNotes = (req, res ) => {
    console.log('Get Notes')
    try {
      Note.find({ createdBy: req.user._id  })
      .populate("createdBy", "_id name")
      .then((note) => {
        res.json({ note });
      });
    } catch (error) {
      console.log(error)
    }
  }

exports.deleteNote = async (req, res) => {
    console.log('Delete Note Api')
    try {
        const note = await new mongoose.Types.ObjectId(req.params.id);
        if(!note) {
          return res.status(404).json({
            success: false,
            error: "Note not found."
          });
        }
        await Note.findByIdAndDelete({_id: req.params.id});
        return res.status(201);
    } catch (error) {
        console.log(error)
        return res.status(500);
    }
}
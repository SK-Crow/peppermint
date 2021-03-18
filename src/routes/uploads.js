const express = require("express");
const mongoose = require("mongoose");
const uploadRouter = express.Router();

const TicketSchema = mongoose.model("TicketSchema");
const File = mongoose.model("file");

const { isAuth } = require("../middleware/authCheck");

let url = null;

if (process.env.NODE_ENV === "production") {
  url = process.env.MONGO_URI_DOCKER;
} else {
  url = process.env.MONGO_URI_DEV;
}

module.exports = (upload) => {
  const connect = mongoose.createConnection(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  let gfs;

  connect.once("open", () => {
    // initialize stream
    gfs = new mongoose.mongo.GridFSBucket(connect.db, {
      bucketName: "uploads",
    });
  });

  uploadRouter
    .route("/")
    .post(upload.single("file"), isAuth, (req, res, next) => {
      try {
        // check for existing files
        File.findOne({ filename: req.body.filename }).then((file) => {
          console.log(file);
          if (file) {
            return res.status(200).json({
              success: false,
              message: "Image already exists",
            });
          }
          let newFile = new File({
            filename: req.body.filename,
            user: req.user._id,
            ticket: req.body.ticket,
            fileId: mongoose.Types.ObjectId(req.file.id),
          });

          newFile
            .save()
            .then((file) => {
              res.status(200).json({
                success: true,
                file,
              });
            })
            .catch((err) => res.status(500).json(err));
        });
      } catch (error) {}
    });

  // GET file linked to ticket
  uploadRouter.route("/files/:id").get((req, res, next) => {
    File.find({ ticket: mongoose.Types.ObjectId(req.params.id) }).then(
      (files) => {
        res.status(200).json({
          success: true,
          files,
        });
      }
    );
  });

  // Delete file linked to ticket
  uploadRouter.route("/files/del").post((req, res, next) => {
    File.findOne({ _id: req.body.file }).then((file) => {
      if (file) {
        File.deleteOne({ _id: req.body.file }).then(() => {
          return console.log("file deleted");
        });
      } else {
        console.log("Error");
      }
    });
    gfs.delete(new mongoose.Types.ObjectId(req.body.fileid), (err, data) => {
      if (err) {
        console.log(err);
        return res.status(404).json({ err: err });
      }
      File.find({ ticket: mongoose.Types.ObjectId(req.body.ticket) }).then(
        (files) => {
          res.status(200).json({
            success: true,
            files,
            message: `File with ID ${req.params.id} is deleted`,
          });
        }
      );
    });
  });

  // Download file
  uploadRouter.route("/files/download/:id").post((req, res, next) => {
    gfs.findOne({ fileId: mongoose.Types.ObjectId(req.params.id) }, function (err, file) {
      if (err) {
          return res.status(400).send(err);
      }
      else if (!file) {
          return res.status(404).send('Error on the database looking for the file.');
      }
  
      res.set('Content-Type', file.contentType);
      res.set('Content-Disposition', 'attachment; filename="' + file.filename + '"');
  
      var readstream = gfs.createReadStream({
        _id: req.params.id,
      });
  
      readstream.on("error", function(err) { 
          res.end();
      });
      readstream.pipe(res);
    });
  });

  return uploadRouter;
};

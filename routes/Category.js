const express=require("express")
const categoryController=require("../controllers/Category")
const router=express.Router()

router
    .get("/",categoryController.getAll)
    .post("/", categoryController.create)
    .patch("/:id", categoryController.updateById)
    .delete("/:id", categoryController.deleteById);

    
module.exports=router
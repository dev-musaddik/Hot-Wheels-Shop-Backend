const { Schema, default: mongoose } = require("mongoose")
const Product=require("../models/Product")
const { uploadImage } = require("../utils/Cloudinary");

exports.create=async(req,res)=>{
    try {
        const { images, thumbnail, ...productData } = req.body;
        const uploadedImageUrls = [];

        // Upload thumbnail
        const thumbnailUrl = await uploadImage(thumbnail);
        productData.thumbnail = thumbnailUrl;

        // Upload other images
        for (const image of images) {
            const imageUrl = await uploadImage(image);
            uploadedImageUrls.push(imageUrl);
        }
        productData.images = uploadedImageUrls;

        const created=new Product(productData)
        await created.save()
        res.status(201).json(created)
    } catch (error) {
        console.log(error);
        return res.status(500).json({message:'Error adding product, please trying again later'})
    }
}

exports.getAll = async (req, res) => {
    try {
        const filter={}
        const sort={}
        let skip=0
        let limit=0

        if(req.query.brand){
            filter.brand={$in:req.query.brand}
        }

        if(req.query.category){
            filter.category={$in:req.query.category}
        }

        if(req.query.user){
            filter['isDeleted']=false
        }

        if(req.query.sort){
            sort[req.query.sort]=req.query.order?req.query.order==='asc'?1:-1:1
        }

        if(req.query.page && req.query.limit){

            const pageSize=req.query.limit
            const page=req.query.page

            skip=pageSize*(page-1)
            limit=pageSize
        }

        const totalDocs=await Product.find(filter).sort(sort).populate("brand").countDocuments().exec()
        const results=await Product.find(filter).sort(sort).populate("brand").skip(skip).limit(limit).exec()

        res.set("X-Total-Count",totalDocs)

        res.status(200).json(results)
    
    } catch (error) {
        console.log(error);
        res.status(500).json({message:'Error fetching products, please try again later'})
    }
};

exports.getById=async(req,res)=>{
    try {
        const {id}=req.params
        const result=await Product.findById(id).populate("brand").populate("category")
        res.status(200).json(result)
    } catch (error) {
        console.log(error);
        res.status(500).json({message:'Error getting product details, please try again later'})
    }
}

exports.updateById=async(req,res)=>{
    try {
        const { id } = req.params;
        const { images, thumbnail, ...productData } = req.body;
        const uploadedImageUrls = [];

        // Handle thumbnail update if provided
        if (thumbnail && !thumbnail.startsWith('http')) { // Check if it's a new base64 image
            const thumbnailUrl = await uploadImage(thumbnail);
            productData.thumbnail = thumbnailUrl;
        }

        // Handle other images update if provided
        if (images && images.length > 0) {
            for (const image of images) {
                if (!image.startsWith('http')) { // Check if it's a new base64 image
                    const imageUrl = await uploadImage(image);
                    uploadedImageUrls.push(imageUrl);
                } else {
                    uploadedImageUrls.push(image); // Keep existing URL
                }
            }
            productData.images = uploadedImageUrls;
        }

        const updated=await Product.findByIdAndUpdate(id,productData,{new:true})
        res.status(200).json(updated)
    } catch (error) {
        console.log(error);
        res.status(500).json({message:'Error updating product, please try again later'})
    }
}

exports.undeleteById=async(req,res)=>{
    try {
        const {id}=req.params
        const unDeleted=await Product.findByIdAndUpdate(id,{isDeleted:false},{new:true}).populate('brand')
        res.status(200).json(unDeleted)
    } catch (error) {
        console.log(error);
        res.status(500).json({message:'Error restoring product, please try again later'})
    }
}

exports.deleteById=async(req,res)=>{
    try {
        const {id}=req.params
        const deleted=await Product.findByIdAndUpdate(id,{isDeleted:true},{new:true}).populate("brand")
        res.status(200).json(deleted)
    } catch (error) {
        console.log(error);
        res.status(500).json({message:'Error deleting product, please try again later'})
    }
}



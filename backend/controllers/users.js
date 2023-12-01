const User = require('../models/User');
const cloudinary = require('../utils/cloudinary');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender
    };

    Object.keys(fieldsToUpdate).forEach(key => {
      if (fieldsToUpdate[key] === undefined) {
        delete fieldsToUpdate[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.avatar && user.avatar.public_id) {
      await cloudinary.uploader.destroy(user.avatar.public_id);
    }

    const result = await cloudinary.uploader.upload(req.body.avatar, {
      folder: 'ecommerce/avatars',
      width: 150,
      crop: 'scale'
    });

    user.avatar = {
      public_id: result.public_id,
      url: result.secure_url
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.addAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (req.body.isDefault) {
      user.addresses.forEach(address => {
        address.isDefault = false;
      });
    }

    user.addresses.push(req.body);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address added successfully',
      user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const address = user.addresses.id(req.params.addressId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    if (req.body.isDefault) {
      user.addresses.forEach(addr => {
        addr.isDefault = false;
      });
    }

    Object.assign(address, req.body);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.addresses.pull({ _id: req.params.addressId });
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
      user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.setDefaultAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    user.addresses.forEach(address => {
      address.isDefault = address._id.toString() === req.params.addressId;
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Default address updated',
      user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

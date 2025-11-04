const User = require("../models/User");
const bcrypt = require('bcryptjs');
const { sendMail } = require("../utils/Emails");
const { generateOTP } = require("../utils/GenerateOtp");
const Otp = require("../models/OTP");
const { sanitizeUser } = require("../utils/SanitizeUser");
const { generateToken } = require("../utils/GenerateToken");
const PasswordResetToken = require("../models/PasswordResetToken");

exports.signup = async (req, res) => {
    try {
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        req.body.password = hashedPassword;

        const createdUser = new User(req.body);
        await createdUser.save();

        const secureInfo = sanitizeUser(createdUser);
        const token = generateToken(secureInfo);

        res.cookie('token', token, {
            sameSite: process.env.PRODUCTION === 'true' ? "None" : 'Lax',
            maxAge: parseInt(process.env.COOKIE_EXPIRATION_DAYS || '7') * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: process.env.PRODUCTION === 'true'
        });

        res.status(201).json(secureInfo);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error occurred during signup, please try again later" });
    }
};

exports.login = async (req, res) => {
    try {
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser && await bcrypt.compare(req.body.password, existingUser.password)) {
            const secureInfo = sanitizeUser(existingUser);
            const token = generateToken(secureInfo);

            res.cookie('token', token, {
                sameSite: process.env.PRODUCTION === 'true' ? "None" : 'Lax',
                maxAge: parseInt(process.env.COOKIE_EXPIRATION_DAYS || '7') * 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: process.env.PRODUCTION === 'true'
            });

            return res.status(200).json(secureInfo);
        }

        res.clearCookie('token');
        return res.status(404).json({ message: "Invalid Credentials" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Some error occurred while logging in, please try again later' });
    }
};

exports.logout = async (req, res) => {
    try {
        res.cookie('token', '', {
            maxAge: 0,
            sameSite: process.env.PRODUCTION === 'true' ? "None" : 'Lax',
            httpOnly: true,
            secure: process.env.PRODUCTION === 'true'
        });
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error occurred during logout' });
    }
};

exports.checkAuth = async (req, res) => {
    try {
        if (req.user) {
            const user = await User.findById(req.user._id);
            return res.status(200).json(sanitizeUser(user));
        }
        res.sendStatus(401);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
};

exports.verifyOtp = async (req, res) => {
    try {
        const user = await User.findById(req.body.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const otpRecord = await Otp.findOne({ user: user._id });
        if (!otpRecord) return res.status(404).json({ message: 'OTP not found' });

        if (otpRecord.expiresAt < new Date()) {
            await Otp.findByIdAndDelete(otpRecord._id);
            return res.status(400).json({ message: 'OTP has expired' });
        }

        if (await bcrypt.compare(req.body.otp, otpRecord.otp)) {
            await Otp.findByIdAndDelete(otpRecord._id);
            const verifiedUser = await User.findByIdAndUpdate(user._id, { isVerified: true }, { new: true });
            return res.status(200).json(sanitizeUser(verifiedUser));
        }

        return res.status(400).json({ message: 'OTP is invalid or expired' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Some error occurred' });
    }
};

exports.resendOtp = async (req, res) => {
    try {
        const user = await User.findById(req.body.user);
        if (!user) return res.status(404).json({ message: 'User not found' });

        await Otp.deleteMany({ user: user._id });

        const otp = generateOTP();
        const hashedOtp = await bcrypt.hash(otp, 10);

        const newOtp = new Otp({ user: user._id, otp: hashedOtp, expiresAt: Date.now() + parseInt(process.env.OTP_EXPIRATION_TIME || '300000') });
        await newOtp.save();

        await sendMail(user.email, 'OTP Verification', `Your OTP is <b>${otp}</b>. Do not share this with anyone.`);

        res.status(201).json({ message: 'OTP sent' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error occurred while resending OTP' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) return res.status(404).json({ message: 'Email not found' });

        await PasswordResetToken.deleteMany({ user: user._id });

        const resetToken = generateToken(sanitizeUser(user), true);
        const hashedToken = await bcrypt.hash(resetToken, 10);

        const newToken = new PasswordResetToken({ user: user._id, token: hashedToken, expiresAt: Date.now() + parseInt(process.env.OTP_EXPIRATION_TIME || '300000') });
        await newToken.save();

        await sendMail(user.email, 'Password Reset', `<p>Reset your password using this link: <a href="${process.env.ORIGIN}/reset-password/${user._id}/${resetToken}">Reset Password</a></p>`);

        res.status(200).json({ message: `Password reset link sent to ${user.email}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error occurred while sending password reset mail' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const user = await User.findById(req.body.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const resetTokenRecord = await PasswordResetToken.findOne({ user: user._id });
        if (!resetTokenRecord) return res.status(404).json({ message: 'Reset link is invalid' });

        if (resetTokenRecord.expiresAt < new Date()) {
            await PasswordResetToken.findByIdAndDelete(resetTokenRecord._id);
            return res.status(404).json({ message: 'Reset link has expired' });
        }

        if (await bcrypt.compare(req.body.token, resetTokenRecord.token)) {
            await User.findByIdAndUpdate(user._id, { password: await bcrypt.hash(req.body.password, 10) });
            await PasswordResetToken.findByIdAndDelete(resetTokenRecord._id);
            return res.status(200).json({ message: 'Password updated successfully' });
        }

        res.status(400).json({ message: 'Reset link is invalid or expired' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error occurred while resetting password' });
    }
};
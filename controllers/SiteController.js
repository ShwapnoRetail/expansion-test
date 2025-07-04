const SiteModal = require("../models/SiteModel");
const mongoose = require("mongoose");

const generateCustomId = async () => {
    try {
        // Find the count of existing site
        const count = await SiteModal.countDocuments()+ 20;

        // Generate the custom ID based on the count
        const customId = `SITE${String(count + 1).padStart(4, "0")}`;

        return customId;
    } catch (error) {
        console.error("Error generating custom ID:", error);
        throw error;
    }
};

const search = async (req, res) => {
    const filter = req.body;

    // Set default values for pagination if not provided
    const page = parseInt(req.query.page) || 1; // default to page 1
    const limit = parseInt(req.query.limit) || 100000; // default to 10 items per page
    const searchTerm = (req.query.searchTerm) || ""; // default to 10 items per page

    // console.log({searchTerm});

    if (searchTerm) {
        filter.$or = [
            { customId: { $regex: searchTerm, $options: "i" } }, // Case-insensitive search for customId
            { name: { $regex: searchTerm, $options: "i" } }, // Case-insensitive search for name
        ];
    }

    try {
        const items = await SiteModal.find({ ...filter, isDeleted: false })
            .skip((page - 1) * limit) // calculate the starting index for pagination
            .limit(limit) // limit the number of documents per page
            .lean()
            .populate({
                path: "landlords",
            })
            .populate({
                path: "investors.investorId",
            })
            .populate({
                path: "createdBy",
                populate: [{ path: "managers" }],
                select: "-password",
            })
            .exec();

        const totalItems = await SiteModal.countDocuments({
            ...filter,
            isDeleted: false,
        });
        const totalPages = Math.ceil(totalItems / limit);

        const responseObject = {
            status: true,
            sites: items,
            page,
            limit,
            totalPages,
            totalItems,
        };

        if (items.length) {
            return res.status(200).json(responseObject);
        } else {
            return res.status(404).json({
                status: false,
                message: "Nothing found",
                sites: [],
            });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: false,
            message: `${err}`,
        });
    }
};

// Register a new site
const registerSite = async (req, res) => {
    try {
        const { name } = req.body;
        const site = Boolean(await SiteModal.findOne({ name }));

        // console.log(site);

        if (true) {
            // Generate custom ID
            const customId = await generateCustomId();

            // console.log(customId);

            console.log({ ...req.body, customId });

            // Create new site with custom ID
            const newSite = await SiteModal.create({ ...req.body, customId });

            return res.status(201).send({
                status: true,
                message: "Site created successfully!",
                site: newSite,
            });
        } else {
            return res.status(409).send({
                status: false,
                message: `Site exist with ${name}`,
            });
        }
    } catch (err) {
        console.log(err);
        res.send({
            status: false,
            message: `Error in registration : ${err}`,
        });
    }
};

// GET all sites
const getAllSites = async (req, res) => {
    // console.log(req.body);
    try {
        await search(req, res);
    } catch (err) {
        console.log(err);
        res.status(500).json({
            status: false,
            message: `${err}`,
        });
    }
};

// GET site by Id
const getOneSite = async (req, res) => {
    const { id } = req.params;

    // console.log(id);

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                status: false,
                message: `Site Object Id Incorrect`,
            });
        }

        let foundSite = await SiteModal.findById(id)
            .lean()
            .populate({
                path: "landlords",
            })
            .populate({
                path: "investors.investorId",
            })
            .populate({
                path: "createdBy",
                select: "-password",
            })
            .exec();
        // .populate({
        //   path: "sites",
        // });

        if (!foundSite) {
            return res.status(404).json({
                status: false,
                message: `Site not found`,
            });
        }

        foundSite = {
            ...foundSite,
        };

        res.status(200).json({
            status: true,
            site: foundSite,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            status: false,
            message: `${err}`,
        });
    }
};
// Update site by Id
const updateSite = async (req, res) => {
    const { id } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                status: false,
                message: `Site Id incorrect`,
            });
        }

        const site = await SiteModal.findById(id);
        const siteExist = Boolean(site);

        if (!siteExist) {
            return res.status(401).json({
                status: false,
                message: `Site doesn't exist`,
            });
        }

        let updatedSite = await SiteModal.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });

        res.status(201).json({
            status: true,
            message: "Site updated successfully",
            site: updatedSite,
        });
    } catch (err) {
        res.status(500).json({
            status: false,
            message: `${err}`,
        });
    }
};




module.exports = {
    registerSite,
    getAllSites,
    getOneSite,
    updateSite,
};

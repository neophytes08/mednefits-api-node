const getClinicTypeProperties = async (findHead) => {
   if(findHead.name == "GP")
    {
        type = "general_practitioner";
        clinicTypeName = "GP";
        image = "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515238/tidzdguqbafiq4pavekj.png";
    }
    else if(findHead.name == "Dental")
    {
        type = "dental_care";
        clinicTypeName = "Dental";
        image = "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515231/lhp4yyltpptvpfxe3dzj.png";
    }
    else if(findHead.name == "TCM")
    {
        type = "tcm";
        clinicTypeName = "TCM";
        image = "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515256/jyocn9mr7mkdzetjjmzw.png";
    }
    else if(findHead.name == "Screening")
    {
        type = "health_screening";
        clinicTypeName = "Screening";
        image = "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515243/v9fcbbdzr6jdhhlba23k.png";
    }
    else if(findHead.name == "Wellness")
    {
        type = "wellness";
        clinicTypeName = "Wellness";
        image = "https://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515261/phvap8vk0suwhh2grovj.png";
    }
    else if(findHead.name == "Specialist")
    {
        type = "health_specialist";
        clinicTypeName = "Specialist";
        image = "ttps://res.cloudinary.com/dzh9uhsqr/image/upload/v1514515247/toj22uow68w9yf4xnn41.png";
    }

    return { type: type, clinicTypeName: clinicTypeName, image };
}
module.exports = {
    getClinicTypeProperties
};
export const locationDictionary: Record<string, string> = {
  // Divisions
  "Barishal": "বরিশাল",
  "Chattogram": "চট্টগ্রাম",
  "Dhaka": "ঢাকা",
  "Khulna": "খুলনা",
  "Mymensingh": "ময়মনসিংহ",
  "Rajshahi": "রাজশাহী",
  "Rangpur": "রংপুর",
  "Sylhet": "সিলেট",

  // Districts
  "Barguna": "বরগুনা",
  "Bhola": "ভোলা",
  "Jhalokati": "ঝালকাঠি",
  "Patuakhali": "পটুয়াখালী",
  "Pirojpur": "পিরোজপুর",
  "Bandarban": "বান্দরবান",
  "Brahmanbaria": "ব্রাহ্মণবাড়িয়া",
  "Chandpur": "চাঁদপুর",
  "Comilla": "কুমিল্লা",
  "Cox's Bazar": "কক্সবাজার",
  "Feni": "ফেনী",
  "Khagrachhari": "খাগড়াছড়ি",
  "Lakshmipur": "লক্ষ্মীপুর",
  "Noakhali": "নোয়াখালী",
  "Rangamati": "রাঙ্গামাটি",
  "Faridpur": "ফরিদপুর",
  "Gazipur": "গাজীপুর",
  "Gopalganj": "গোপালগঞ্জ",
  "Kishoreganj": "কিশোরগঞ্জ",
  "Madaripur": "মাদারীপুর",
  "Manikganj": "মানিকগঞ্জ",
  "Munshiganj": "মুন্সিগঞ্জ",
  "Narayanganj": "নারায়ণগঞ্জ",
  "Narsingdi": "নরসিংদী",
  "Rajbari": "রাজবাড়ী",
  "Shariatpur": "শরীয়তপুর",
  "Tangail": "টাঙ্গাইল",
  "Bagerhat": "বাগেরহাট",
  "Chuadanga": "চুয়াডাঙ্গা",
  "Jashore": "যশোর",
  "Jhenaidah": "ঝিনাইদহ",
  "Kushtia": "কুষ্টিয়া",
  "Magura": "মাগুরা",
  "Meherpur": "মেহেরপুর",
  "Narail": "নড়াইল",
  "Satkhira": "সাতক্ষীরা",
  "Jamalpur": "জামালপুর",
  "Netrokona": "নেত্রকোনা",
  "Sherpur": "শেরপুর",
  "Bogura": "বগুড়া",
  "Joypurhat": "জয়পুরহাট",
  "Naogaon": "নওগাঁ",
  "Natore": "নাটোর",
  "Chapainawabganj": "চাঁপাইনবাবগঞ্জ",
  "Pabna": "পাবনা",
  "Sirajganj": "সিরাজগঞ্জ",
  "Dinajpur": "দিনাজপুর",
  "Gaibandha": "গাইবান্ধা",
  "Kurigram": "কুড়িগ্রাম",
  "Lalmonirhat": "লালমনিরহাট",
  "Nilphamari": "নীলফামারী",
  "Panchagarh": "পঞ্চগড়",
  "Thakurgaon": "ঠাকুরগাঁও",
  "Habiganj": "হবিগঞ্জ",
  "Moulvibazar": "মৌলভীবাজার",
  "Sunamganj": "সুনামগঞ্জ",

  // Common Upazilas (Adding Nagarpur and others)
  "Nagarpur": "নাগরপুর",
  "Tangail Sadar": "টাঙ্গাইল সদর",
  "Mirzapur": "মির্জাপুর",
  "Sakhipur": "সখিপুর",
  "Madhupur": "মধুপুর",
  "Ghatail": "ঘাটাইল",
  "Kalihati": "কালিহাতী",
  "Gopalpur": "গোপালপুর",
  "Bhuapur": "ভূঞাপুর",
  "Basail": "বাসাইল",
  "Delduar": "দেলদুয়ার",
  "Dhanbari": "ধনবাড়ী",
  "Savar": "সাভার",
  "Dhamrai": "ধামরাই",
  "Keraniganj": "কেরানীগঞ্জ",
  "Nawabganj": "নবাবগঞ্জ",
  "Dohar": "দোহার",
  
  // Common terms
  "Sadar": "সদর",

  // Vehicle Types
  "Ambulance": "অ্যাম্বুলেন্স",
  "Truck": "ট্রাক",
  "Pickup": "পিকআপ",
  "Microbus": "মাইক্রোবাস",
  "Car": "প্রাইভেট কার",
  "CNG": "সিএনজি",
  "Auto Rickshaw": "অটো রিকশা",
  "Motorcycle": "মোটরসাইকেল"
};

export const translateLocation = (name: string | undefined | null, isBn: boolean): string => {
  if (!name) return '';
  if (!isBn) return name;
  
  // Direct match
  if (locationDictionary[name]) {
    return locationDictionary[name];
  }

  // Try to replace known parts (e.g. "Tangail Sadar" -> "টাঙ্গাইল সদর")
  let translated = name;
  Object.keys(locationDictionary).forEach(key => {
    // Replace whole words only to avoid partial matches like "pur"
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    translated = translated.replace(regex, locationDictionary[key]);
  });

  return translated;
};

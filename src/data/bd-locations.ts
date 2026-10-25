export const bdDivisions = [
  { division: "Barishal", divisionbn: "বরিশাল" },
  { division: "Chattogram", divisionbn: "চট্টগ্রাম" },
  { division: "Dhaka", divisionbn: "ঢাকা" },
  { division: "Khulna", divisionbn: "খুলনা" },
  { division: "Mymensingh", divisionbn: "ময়মনসিংহ" },
  { division: "Rajshahi", divisionbn: "রাজশাহী" },
  { division: "Rangpur", divisionbn: "রংপুর" },
  { division: "Sylhet", divisionbn: "সিলেট" }
];

export const bdDistricts: Record<string, any[]> = {
  barishal: [
    { district: "Barguna", districtbn: "বরগুনা", upazilla: ["Amtali", "Bamna", "Barguna Sadar", "Betagi", "Patharghata", "Taltali"] },
    { district: "Barishal", districtbn: "বরিশাল", upazilla: ["Agailjhara", "Babuganj", "Bakerganj", "Banaripara", "Barishal Sadar", "Gournadi", "Hizla", "Mehendiganj", "Muladi", "Wazirpur", "Kotwali Model", "Kaunia", "Bandar", "Airport"] },
    { district: "Bhola", districtbn: "ভোলা", upazilla: ["Bhola Sadar", "Burhanuddin", "Char Fasson", "Daulatkhan", "Lalmohan", "Manpura", "Tazumuddin"] },
    { district: "Jhalokati", districtbn: "ঝালকাঠি", upazilla: ["Jhalokati Sadar", "Kathalia", "Nalchity", "Rajapur"] },
    { district: "Patuakhali", districtbn: "পটুয়াখালী", upazilla: ["Bauphal", "Dashmina", "Dumki", "Galachipa", "Kalapara", "Mirzaganj", "Patuakhali Sadar", "Rangabali"] },
    { district: "Pirojpur", districtbn: "পিরোজপুর", upazilla: ["Bhandaria", "Kawkhali", "Mathbaria", "Nazirpur", "Nesarabad (Swarupkati)", "Pirojpur Sadar", "Zianagar"] }
  ],
  chattogram: [
    { district: "Bandarban", districtbn: "বান্দরবান", upazilla: ["Ali Kadam", "Bandarban Sadar", "Lama", "Naikhongchhari", "Rowangchhari", "Ruma", "Thanchi"] },
    { district: "Brahmanbaria", districtbn: "ব্রাহ্মণবাড়িয়া", upazilla: ["Akhaura", "Bancharampur", "Brahmanbaria Sadar", "Kasba", "Nabinagar", "Nasirnagar", "Sarail", "Ashuganj", "Bijoynagar"] },
    { district: "Chandpur", districtbn: "চাঁদপুর", upazilla: ["Chandpur Sadar", "Faridganj", "Haimchar", "Haziganj", "Kachua", "Matlab Dakshin", "Matlab Uttar", "Shahrasti"] },
    { district: "Chattogram", districtbn: "চট্টগ্রাম", upazilla: ["Anwara", "Banshkhali", "Boalkhali", "Chandanaish", "Fatikchhari", "Hathazari", "Karnaphuli", "Lohagara", "Mirsharai", "Patiya", "Rangunia", "Raozan", "Sandwip", "Satkania", "Sitakunda", "Kotwali", "Double Mooring", "Halishahar", "Khulshi", "Pahartali", "EPZ", "Akbar Shah", "Panchlaish", "Chawkbazar", "Bakalia", "Bandar", "Patenga", "Bayazid Bostami", "Sadarghat"] },
    { district: "Comilla", districtbn: "কুমিল্লা", upazilla: ["Barura", "Brahmanpara", "Burichang", "Chandina", "Chauddagram", "Daudkandi", "Debidwar", "Homna", "Laksam", "Muradnagar", "Nangalkot", "Comilla Adarsha Sadar", "Meghna", "Titas", "Monohargonj", "Comilla Sadar Dakshin"] },
    { district: "Cox's Bazar", districtbn: "কক্সবাজার", upazilla: ["Chakaria", "Cox's Bazar Sadar", "Kutubdia", "Maheshkhali", "Ramu", "Teknaf", "Ukhia", "Pekua"] },
    { district: "Feni", districtbn: "ফেনী", upazilla: ["Chhagalnaiya", "Daganbhuiyan", "Feni Sadar", "Parshuram", "Sonagazi", "Fulgazi"] },
    { district: "Khagrachhari", districtbn: "খাগড়াছড়ি", upazilla: ["Dighinala", "Khagrachhari", "Lakshmichhari", "Mahalchhari", "Manikchhari", "Matiranga", "Panchhari", "Ramgarh"] },
    { district: "Lakshmipur", districtbn: "লক্ষ্মীপুর", upazilla: ["Kamalnagar", "Lakshmipur Sadar", "Raipur", "Ramganj", "Ramgati"] },
    { district: "Noakhali", districtbn: "নোয়াখালী", upazilla: ["Begumganj", "Noakhali Sadar", "Chatkhil", "Companiganj", "Hatiya", "Senbagh", "Sonaimuri", "Subarnachar", "Kabirhat"] },
    { district: "Rangamati", districtbn: "রাঙ্গামাটি", upazilla: ["Bagaichhari", "Barkal", "Kawkhali (Betbunia)", "Belaichhari", "Kaptai", "Juraichhari", "Langadu", "Naniarchar", "Rajasthali", "Rangamati Sadar"] }
  ],
  dhaka: [
    { district: "Dhaka", districtbn: "ঢাকা", upazilla: ["Dhamrai", "Dohar", "Keraniganj", "Nawabganj", "Savar", "Adabor", "Airport", "Badda", "Banani", "Bangshal", "Bhashantek", "Cantonment", "Chakbazar", "Dakshin Khan", "Darus-Salam", "Demra", "Dhanmondi", "Gandaria", "Gulshan", "Hatirjheel", "Hazaribagh", "Jatrabari", "Kadamtoli", "Kafrul", "Kalabagan", "Kamrangirchar", "Khilgaon", "Khilkhet", "Kotwali", "Lalbagh", "Mirpur Model", "Mohammadpur", "Motijheel", "Mugda", "New Market", "Pallabi", "Paltan Model", "Ramna Model", "Rampura", "Rupnagar", "Sabujbag", "Shah Ali", "Shahbag", "Shahjahanpur", "Sher-e-Bangla Nagar", "Shyampur", "Sutrapur", "Tejgaon", "Tejgaon Industrial", "Turag", "Uttar Khan", "Uttara East", "Uttara West", "Vatara", "Wari"] },
    { district: "Faridpur", districtbn: "ফরিদপুর", upazilla: ["Alfadanga", "Bhanga", "Boalmari", "Charbhadrasan", "Faridpur Sadar", "Madhukhali", "Nagarkanda", "Sadarpur", "Saltha"] },
    { district: "Gazipur", districtbn: "গাজীপুর", upazilla: ["Gazipur Sadar", "Kaliakair", "Kaliganj", "Kapasia", "Sreepur"] },
    { district: "Gopalganj", districtbn: "গোপালগঞ্জ", upazilla: ["Gopalganj Sadar", "Kashiani", "Kotalipara", "Muksudpur", "Tungipara"] },
    { district: "Kishoreganj", districtbn: "কিশোরগঞ্জ", upazilla: ["Austagram", "Bajitpur", "Bhairab", "Hossainpur", "Itna", "Karimganj", "Katiadi", "Kishoreganj Sadar", "Kuliarchar", "Mithamain", "Nikli", "Pakundia", "Tarail"] },
    { district: "Madaripur", districtbn: "মাদারীপুর", upazilla: ["Kalkini", "Madaripur Sadar", "Rajoir", "Shibchar"] },
    { district: "Manikganj", districtbn: "মানিকগঞ্জ", upazilla: ["Daulatpur", "Ghior", "Harirampur", "Manikganj Sadar", "Saturia", "Shivalaya", "Singair"] },
    { district: "Munshiganj", districtbn: "মুন্সিগঞ্জ", upazilla: ["Gazaria", "Lohajang", "Munshiganj Sadar", "Sirajdikhan", "Sreenagar", "Tongibari"] },
    { district: "Narayanganj", districtbn: "নারায়ণগঞ্জ", upazilla: ["Araihazar", "Bandar", "Narayanganj Sadar", "Rupganj", "Sonargaon"] },
    { district: "Narsingdi", districtbn: "নরসিংদী", upazilla: ["Belabo", "Monohardi", "Narsingdi Sadar", "Palash", "Raipura", "Shibpur"] },
    { district: "Rajbari", districtbn: "রাজবাড়ী", upazilla: ["Baliakandi", "Goalandaghat", "Pangsha", "Rajbari Sadar", "Kalukhali"] },
    { district: "Shariatpur", districtbn: "শরীয়তপুর", upazilla: ["Bhedarganj", "Damudya", "Gosairhat", "Naria", "Shariatpur Sadar", "Zajira"] },
    { district: "Tangail", districtbn: "টাঙ্গাইল", upazilla: ["Basail", "Bhuapur", "Delduar", "Dhanbari", "Ghatail", "Gopalpur", "Kalihati", "Madhupur", "Mirzapur", "Nagarpur", "Sakhipur", "Tangail Sadar"] }
  ],
  khulna: [
    { district: "Bagerhat", districtbn: "বাগেরহাট", upazilla: ["Bagerhat Sadar", "Chitalmari", "Fakirhat", "Kachua", "Mollahat", "Mongla", "Morrelganj", "Rampal", "Sarankhola"] },
    { district: "Chuadanga", districtbn: "চুয়াডাঙ্গা", upazilla: ["Alamdanga", "Chuadanga Sadar", "Damurhuda", "Jibannagar"] },
    { district: "Jashore", districtbn: "যশোর", upazilla: ["Abhaynagar", "Bagherpara", "Chaugachha", "Jhikargachha", "Keshabpur", "Jashore Sadar", "Manirampur", "Sharsha"] },
    { district: "Jhenaidah", districtbn: "ঝিনাইদহ", upazilla: ["Harinakunda", "Jhenaidah Sadar", "Kaliganj", "Kotchandpur", "Maheshpur", "Shailkupa"] },
    { district: "Khulna", districtbn: "খুলনা", upazilla: ["Batiaghata", "Dacope", "Dumuria", "Dighalia", "Koyra", "Paikgachha", "Phultala", "Rupsha", "Terokhada", "Khulna Sadar", "Sonadanga", "Khalishpur", "Daulatpur", "Khan Jahan Ali", "Harintana", "Arongghata", "Lobonchora"] },
    { district: "Kushtia", districtbn: "কুষ্টিয়া", upazilla: ["Bheramara", "Daulatpur", "Khoksa", "Kumarkhali", "Kushtia Sadar", "Mirpur"] },
    { district: "Magura", districtbn: "মাগুরা", upazilla: ["Magura Sadar", "Mohammadpur", "Shalikha", "Sreepur"] },
    { district: "Meherpur", districtbn: "মেহেরপুর", upazilla: ["Gangni", "Meherpur Sadar", "Mujibnagar"] },
    { district: "Narail", districtbn: "নড়াইল", upazilla: ["Kalia", "Lohagara", "Narail Sadar"] },
    { district: "Satkhira", districtbn: "সাতক্ষীরা", upazilla: ["Assasuni", "Debhata", "Kalaroa", "Kaliganj", "Satkhira Sadar", "Shyamnagar", "Tala"] }
  ],
  mymensingh: [
    { district: "Jamalpur", districtbn: "জামালপুর", upazilla: ["Baksiganj", "Dewanganj", "Islampur", "Jamalpur Sadar", "Madarganj", "Melandaha", "Sarishabari"] },
    { district: "Mymensingh", districtbn: "ময়মনসিংহ", upazilla: ["Bhaluka", "Dhobaura", "Fulbaria", "Gaffargaon", "Gauripur", "Haluaghat", "Ishwarganj", "Mymensingh Sadar", "Muktagachha", "Nandail", "Phulpur", "Trishal", "Tara Khanda"] },
    { district: "Netrokona", districtbn: "নেত্রকোনা", upazilla: ["Atpara", "Barhatta", "Durgapur", "Khaliajuri", "Kalmakanda", "Kendua", "Madan", "Mohanganj", "Netrokona Sadar", "Purbadhala"] },
    { district: "Sherpur", districtbn: "শেরপুর", upazilla: ["Jhenaigati", "Nakla", "Nalitabari", "Sherpur Sadar", "Sreebardi"] }
  ],
  rajshahi: [
    { district: "Bogura", districtbn: "বগুড়া", upazilla: ["Adamdighi", "Bogura Sadar", "Dhunat", "Dupchanchia", "Gabtali", "Kahaloo", "Nandigram", "Sariakandi", "Shajahanpur", "Sherpur", "Shibganj", "Sonatola"] },
    { district: "Joypurhat", districtbn: "জয়পুরহাট", upazilla: ["Akkelpur", "Joypurhat Sadar", "Kalai", "Khetlal", "Panchbibi"] },
    { district: "Naogaon", districtbn: "নওগাঁ", upazilla: ["Atrai", "Badalgachhi", "Manda", "Dhamoirhat", "Mohadevpur", "Naogaon Sadar", "Niamatpur", "Patnitala", "Porsha", "Raninagar", "Sapahar"] },
    { district: "Natore", districtbn: "নাটোর", upazilla: ["Bagatipara", "Baraigram", "Gurudaspur", "Lalpur", "Natore Sadar", "Singra", "Naldanga"] },
    { district: "Chapainawabganj", districtbn: "চাঁপাইনবাবগঞ্জ", upazilla: ["Bholahat", "Gomastapur", "Nachole", "Nawabganj Sadar", "Shibganj"] },
    { district: "Pabna", districtbn: "পাবনা", upazilla: ["Atgharia", "Bera", "Bhangura", "Chatmohar", "Faridpur", "Ishwardi", "Pabna Sadar", "Santhia", "Sujanagar"] },
    { district: "Rajshahi", districtbn: "রাজশাহী", upazilla: ["Bagha", "Bagmara", "Charghat", "Durgapur", "Godagari", "Mohanpur", "Paba", "Puthia", "Tanore", "Boalia", "Rajpara", "Motihar", "Shah Makhdum", "Chandrima", "Kashiadanga", "Katakhali", "Belpukur"] },
    { district: "Sirajganj", districtbn: "সিরাজগঞ্জ", upazilla: ["Belkuchi", "Chauhali", "Kamarkhanda", "Kazipur", "Raiganj", "Shahjadpur", "Sirajganj Sadar", "Tarash", "Ullahpara"] }
  ],
  rangpur: [
    { district: "Dinajpur", districtbn: "দিনাজপুর", upazilla: ["Birampur", "Birganj", "Biral", "Bochaganj", "Chirirbandar", "Phulbari", "Ghoraghat", "Hakimpur", "Kaharole", "Khansama", "Dinajpur Sadar", "Nawabganj", "Parbatipur"] },
    { district: "Gaibandha", districtbn: "গাইবান্ধা", upazilla: ["Phulchhari", "Gaibandha Sadar", "Gobindaganj", "Palashbari", "Sadullapur", "Sughatta", "Sundarganj"] },
    { district: "Kurigram", districtbn: "কুড়িগ্রাম", upazilla: ["Bhurungamari", "Char Rajibpur", "Chilmari", "Phulbari", "Kurigram Sadar", "Nageshwari", "Rajarhat", "Raomari", "Ulipur"] },
    { district: "Lalmonirhat", districtbn: "লালমনিরহাট", upazilla: ["Aditmari", "Hatibandha", "Kaliganj", "Lalmonirhat Sadar", "Patgram"] },
    { district: "Nilphamari", districtbn: "নীলফামারী", upazilla: ["Dimla", "Domar", "Jaldhaka", "Kishoreganj", "Nilphamari Sadar", "Saidpur"] },
    { district: "Panchagarh", districtbn: "পঞ্চগড়", upazilla: ["Atwari", "Boda", "Debiganj", "Panchagarh Sadar", "Tetulia"] },
    { district: "Rangpur", districtbn: "রংপুর", upazilla: ["Badarganj", "Gangachhara", "Kaunia", "Rangpur Sadar", "Mithapukur", "Pirgachha", "Pirganj", "Taraganj", "Kotwali", "Tajhat", "Hazirhat", "Parshuram", "Haragach", "Mahiganj"] },
    { district: "Thakurgaon", districtbn: "ঠাকুরগাঁও", upazilla: ["Baliadangi", "Haripur", "Pirganj", "Ranisankail", "Thakurgaon Sadar"] }
  ],
  sylhet: [
    { district: "Habiganj", districtbn: "হবিগঞ্জ", upazilla: ["Ajmiriganj", "Bahubal", "Baniyachong", "Chunarughat", "Habiganj Sadar", "Lakhai", "Madhabpur", "Nabiganj", "Shayestaganj"] },
    { district: "Moulvibazar", districtbn: "মৌলভীবাজার", upazilla: ["Barlekha", "Kamalganj", "Kulaura", "Moulvibazar Sadar", "Rajnagar", "Sreemangal", "Juri"] },
    { district: "Sunamganj", districtbn: "সুনামগঞ্জ", upazilla: ["Bishwamvarpur", "Chhatak", "Derai", "Dharampasha", "Dowarabazar", "Jagannathpur", "Jamalganj", "Sullah", "Sunamganj Sadar", "Tahirpur", "Dakshin Sunamganj"] },
    { district: "Sylhet", districtbn: "সিলেট", upazilla: ["Balaganj", "Beanibazar", "Bishwanath", "Companiganj", "Fenchuganj", "Golapganj", "Gowainghat", "Jaintiapur", "Kanaighat", "Sylhet Sadar", "Zakiganj", "Dakshin Surma", "Osmaninagar", "Kotwali Model", "Jalalabad", "South Surma", "Shah Poran", "Moglabazar", "Bimanbandar"] }
  ]
};

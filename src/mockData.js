const SUBJECTS = ["AWD", "WFS", "ASP.NET", "Linux", "SE"];

const generateAttendance = (presentProbability) => {
  const attendance = {};
  for (let day = 1; day <= 30; day++) {
    const formattedDay = day < 10 ? `0${day}` : `${day}`;
    const dateKey = `2026-08-${formattedDay}`;
    
    attendance[dateKey] = {};
    SUBJECTS.forEach((sub) => {
      const isPresent = Math.random() < presentProbability;
      attendance[dateKey][sub] = isPresent ? "Present" : "Absent";
    });
  }
  return attendance;
};

const calculateLectures = (attendanceObj) => {
  const stats = {};
  SUBJECTS.forEach((sub) => {
    let total = 0;
    let attended = 0;
    Object.values(attendanceObj).forEach((dayRecord) => {
      if (dayRecord[sub]) {
        total += 1;
        if (dayRecord[sub] === "Present") attended += 1;
      }
    });
    stats[sub] = { totalLecture: total, attendedLecture: attended };
  });
  return stats;
};

const defaultStudentsList = [
  { name: "Sunny", roll: "92", ratio: 0.85 },
  { name: "Rahul", roll: "45", ratio: 0.75 },
  { name: "Raj", roll: "94", ratio: 0.95 },
  { name: "Rajan", roll: "96", ratio: 0.65 },
  { name: "Shubham", roll: "80", ratio: 0.40 },
  { name: "Amit", roll: "12", ratio: 0.80 },
  { name: "Priya", roll: "23", ratio: 0.90 }
];

const initialStudentsData = defaultStudentsList.map((item) => {
  const attData = generateAttendance(item.ratio);
  return {
    studentName: item.name,
    rollNumber: item.roll,
    password: "password123",
    ...calculateLectures(attData),
    attendance: attData
  };
});

export const getInitialStudents = () => {
  const saved = localStorage.getItem("portal_students_data");
  return saved ? JSON.parse(saved) : initialStudentsData;
};
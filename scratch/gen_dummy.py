import csv
import os
from datetime import datetime

os.makedirs('public/dummy_data', exist_ok=True)

# 1. Employees CSV
employees = [
    {"Machine ID": 1, "Name": "Alice Valid", "Date of Joining": "2026-01-01", "Salary": 30000},
    {"Machine ID": 2, "Name": "Bob Sandwich", "Date of Joining": "2026-01-01", "Salary": 35000},
    {"Machine ID": 3, "Name": "Charlie BigSandwich", "Date of Joining": "2026-01-01", "Salary": 40000},
    {"Machine ID": 4, "Name": "David HalfAbsent", "Date of Joining": "2026-01-01", "Salary": 45000},
    {"Machine ID": 5, "Name": "Eve PaidFlank", "Date of Joining": "2026-01-01", "Salary": 50000},
]

with open('public/dummy_data/employees.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=["Machine ID", "Name", "Date of Joining", "Salary"])
    writer.writeheader()
    writer.writerows(employees)

# 2. Attendance Generator
def generate_essl_report(year, month, filename):
    if month in [4, 6]: days = 30
    elif month == 2: days = 28
    else: days = 31
    
    with open(f'public/dummy_data/{filename}', 'w', newline='') as f:
        writer = csv.writer(f)
        
        # Write 11 empty rows to pad the header so days row is index 11 (row 12)
        for _ in range(11):
            writer.writerow([])
            
        # Row 12: Days row
        days_row = ["", ""]
        for d in range(1, days + 1):
            date_obj = datetime(year, month, d)
            days_row.append(date_obj.strftime("%d-%b"))
        writer.writerow(days_row)
        
        # Now blocks for each employee
        for emp in employees:
            emp_id = emp["Machine ID"]
            
            # Row 0 of block (anchor)
            writer.writerow(["", "Employee Code:-", str(emp_id)])
            writer.writerow([]) # +1
            writer.writerow([]) # +2
            
            in_time_row = ["", "In Time"] # +3
            out_time_row = ["", "Out Time"] # +4
            writer.writerow([]) # +5
            writer.writerow([]) # +6
            writer.writerow([]) # +7
            duration_row = ["", "Duration"] # +8
            writer.writerow([]) # +9
            status_row = ["", "Status"] # +10
            
            for d in range(1, days + 1):
                date_obj = datetime(year, month, d)
                is_sunday = date_obj.weekday() == 6
                
                in_time = "09:30"
                out_time = "18:30"
                status = "P"
                
                if is_sunday:
                    in_time = ""
                    out_time = ""
                    status = "WO"
                
                if d == 14:
                    if emp_id in [2, 3, 4]:
                        status = "A"
                        in_time = ""
                        out_time = ""
                
                if d == 16:
                    if emp_id in [2, 3]:
                        status = "A"
                        in_time = ""
                        out_time = ""
                
                in_time_row.append(in_time)
                out_time_row.append(out_time)
                duration_row.append("09:00" if in_time else "")
                status_row.append(status)
                
            writer.writerow(in_time_row)
            writer.writerow(out_time_row)
            writer.writerow(duration_row)
            writer.writerow(status_row)
            writer.writerow([]) # +11

generate_essl_report(2026, 4, 'apr_attendance.csv')
generate_essl_report(2026, 5, 'may_attendance.csv')
generate_essl_report(2026, 6, 'jun_attendance.csv')
generate_essl_report(2026, 7, 'jul_attendance.csv')

print("Generated dummy CSV files successfully.")

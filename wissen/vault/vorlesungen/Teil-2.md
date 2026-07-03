---
titel: "Teil 2"
quelle: "Studium Andrin (HSLU/ETH)"
datei: "Teil 2.pdf"
seiten: 14
ocr-seiten: 0
tags: [bauwissen, vorlesung]
---

# Teil 2

## S. 1

Frage 16
Falsch
Erreichbare Punkte: 3.00
COMPAS
What does the following Python code snippet do?
from compas.geometry import Vector
v = Vector(1, 2, 3)
v.unitize()
× It returns a unitized (with a length of 1) copy of this vector
× It creates a Vector with coordinates (1, 2, 3)
× It creates a new Point at the origin
✓It scales v in-place to have a length of 1
Bewertungsmethode: SC1/0
Explanation:
The method unitize() of the class Vector scales the vector in place, to have a length of 1.
*NOTE that the method unitized() will instead return a copy of the vector, unitized.
It returns a unitized (with a length of 1) copy of this vector: Nicht richtig
It creates a Vector with coordinates (1, 2, 3): Nicht richtig
It creates a new Point at the origin: Nicht richtig
It scales v in-place to have a length of 1: Richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
1 von 14
07.11.2024, 17:10

## S. 2

Frage 17
Richtig
Erreichbare Punkte: 2.00
COMPAS
Given the following Python code snippet, what will be the result?
from compas.geometry import Point
p1 = Point(1, 2, 3)
p2 = Point(4, 5, 6)
result = p1.distance_to_point(p2)
✓result will contain the distance between p1 and p2
× result will contain the coordinates of p2
× result will contain the dot product of p1 and p2
× The code will raise an error
Bewertungsmethode: SC1/0
Explanation
The Point class of COMPAS has several attributes and methods, among them, there are methods to
objects, such as points. The method distance_to_point() accepts one other point as parameter and 
Euclidian distance between the two. 
result will contain the distance between p1 and p2: Richtig
result will contain the coordinates of p2: Nicht richtig
result will contain the dot product of p1 and p2: Nicht richtig
The code will raise an error: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
2 von 14
07.11.2024, 17:10

## S. 3

Frage 18
Richtig
Erreichbare Punkte: 2.00
COMPAS
Assuming the following code:
from compas.geometry import Point
point = Point(10, 20, 5)
How do you access its x coordinate?
✓point.x
× point.x_coordinate
× point.get_x()
× x of point
Bewertungsmethode: SC1/0
Explanation
The Point class of COMPAS contains attributes to access its coordinates, named x, y and z respecti
the dot notation (eg. instance.attribute). In our case, to access the x coordinate of the point variable
this value, we can print it directly using print(point.x). If we want to assign it to a variable: my_var = 
point.x: Richtig
point.x_coordinate: Nicht richtig
point.get_x(): Nicht richtig
x of point: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
3 von 14
07.11.2024, 17:10

## S. 4

Frage 19
Richtig
Erreichbare Punkte: 2.00
COMPAS
In the code snippet below, what is the purpose of the Box class method from_width_height_depth?
from compas.geometry import Box
box = Box.from_width_height_depth(4, 3, 2)
✓It creates a new Box with the specified dimensions
× It returns the width, height, and depth of the box.
× It calculates the volume of the box.
× It resizes the existing box to the specified dimensions
Bewertungsmethode: SC1/0
Explanation:
The method from_width_height_depth() is an alternative constructor for the Box class, which will i
and depth.
Note that width is along the X-axis, height along Z-axis, and depth along the Y-axis.
It creates a new Box with the specified dimensions: Richtig
It returns the width, height, and depth of the box.: Nicht richtig
It calculates the volume of the box.: Nicht richtig
It resizes the existing box to the specified dimensions: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
4 von 14
07.11.2024, 17:10

## S. 5

Frage 20
Richtig
Erreichbare Punkte: 3.00
Data types
Suppose my_list = [3, 6, 12, 24, 5, 10, 15, 20].
Which of the statements returns the following list [6, 24, 10, 20]?
× print(my_list[-1:-7:-2])
× print(my_list[1:8])
× print(my_list[::2])
✓print(my_list[1::2])
Bewertungsmethode: SC1/0
Explanation:
We can use the following syntax to pick a particular list slice: list_name[start,stop,step].
The order is always [start : stop : step]. By default, start is zero, and step is one. You have the opti
want to keep the defaults. Negative numbers in the start or stop positions mean that the slice will 
print(my_list[-1:-7:-2]): Nicht richtig
print(my_list[1:8]): Nicht richtig
print(my_list[::2]): Nicht richtig
print(my_list[1::2]): Richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
5 von 14
07.11.2024, 17:10

## S. 6

Frage 21
Richtig
Erreichbare Punkte: 1.00
Data types
Which of the following functions converts a string to a float in python?
× int(x)
S
✓float(x)
S
× list(x)
S
× str(x)
S
Bewertungsmethode: SC1/0
Explanation:
In Python, we can convert any data type to a floating-point number, using the built-in method float(
data type of the string to a float. This method only accepts one parameter, and that is also optional 
the method returns 0.
int(x): Nicht richtig
float(x): Richtig
list(x): Nicht richtig
str(x): Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
6 von 14
07.11.2024, 17:10

## S. 7

Frage 22
Richtig
Erreichbare Punkte: 1.00
Data types
What is the output of the following code?
room_name="Kitchen"
print(room_name)
✓Kitchen
× None
× room_name
× "room_name"
Bewertungsmethode: SC1/0
Explanation:
The statement print(room_name), accesses and prints the value Kitchen of the variable room_name.
Kitchen: Richtig
None: Nicht richtig
room_name: Nicht richtig
"room_name": Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
7 von 14
07.11.2024, 17:10

## S. 8

Frage 23
Richtig
Erreichbare Punkte: 1.00
Data types
What is the result of 3 * "tower"?
× tower * 3
× 3tower
✓towertowertower
× tower3
Bewertungsmethode: SC1/0
Explanation:
In Python, you can use the multiplication operator (*) to quickly duplicate or repeat strings, with a 
new_string = original_string * times_to_repeat
So, 3 * "tower" equals to towertowertower.
tower * 3: Nicht richtig
3tower: Nicht richtig
towertowertower: Richtig
tower3: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
8 von 14
07.11.2024, 17:10

## S. 9

Frage 24
Richtig
Erreichbare Punkte: 1.00
Data types
How do you create a set of numbers in Python?
✓set([1, 2, 3])
× set(1, 2, 3)
× set[1, 2, 3]
× set<1, 2, 3>
Bewertungsmethode: SC1/0
Explanation:
A set can be created in two ways:
First, you can define a set with the built-in set() function, which only takes a sequence or a list of it
Alternately, a set can be defined with curly braces ({}).
set([1, 2, 3]): Richtig
set(1, 2, 3): Nicht richtig
set[1, 2, 3]: Nicht richtig
set<1, 2, 3>: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
9 von 14
07.11.2024, 17:10

## S. 10

Frage 25
Richtig
Erreichbare Punkte: 2.00
Data types
Which of the following statements will not return the float value 23.0?
× print(float("23"))
✓print(float("int: 23"))
× print(float(int(23.2)))
× print(float(23))
Bewertungsmethode: SC1/0
Explanation
• The statement print(float("23")) will cast (convert) the string "23" to the floating-point numb
• The statement print(float(23)) will cast the integer 23 to the floating-point number 23.0.
• The statement print(float(int(23.2))) will first cast the floating-point number 23.2 to the intege
subsequently the method float() will cast the newly created integer 23 to the float 23.0.
• The statement print(float("int: 23")) will try to cast the string "int: 23" to a floating-point num
could not convert string to float: 'int: 23', because it cannot convert the part "int: " to a float.
print(float("23")): Nicht richtig
print(float("int: 23")): Richtig
print(float(int(23.2))): Nicht richtig
print(float(23)): Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
10 von 14
07.11.2024, 17:10

## S. 11

Frage 26
Richtig
Erreichbare Punkte: 1.00
Data types
What data type is the object below?
a = [1, 23, 'hello', 1]
× tuple
S
✓list
S
× integer
S
× set
S
Bewertungsmethode: SC1/0
Explanation:
The syntax [] defines a list.
tuple: Nicht richtig
list: Richtig
integer: Nicht richtig
set: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
11 von 14
07.11.2024, 17:10

## S. 12

Frage 27
Falsch
Erreichbare Punkte: 2.00
Data types
Consider the following code. What will it print?
blueprint = [1, 2, 3, 4]
print(blueprint[1:3])
× [1, 3]
× [1, 2, 3]
× [1, 2, 3, 4]
✓[2, 3]
Bewertungsmethode: SC1/0
Explanation:
Using the slice notation (:) when accessing a list item through its index, with the syntax list[start_ind
simple words, is creating a new list, which is a subset of the initial list. The start_index is inclusive, w
be included in the sliced list, while the end_index is exclusive, which means that the end_index will 
In our case, blueprint[1:3] will create a copy of the blueprint list, including the following elements: [2
[1, 3]: Nicht richtig
[1, 2, 3]: Nicht richtig
[1, 2, 3, 4]: Nicht richtig
[2, 3]: Richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
12 von 14
07.11.2024, 17:10

## S. 13

Frage 28
Richtig
Erreichbare Punkte: 2.00
Data types
What will the following code print?
a = True
b = False
if a or b:
   print("Coding")
if a and b:
   print("Architecture")
✓"Coding"
× "Architecture"
× "Coding"
"Architecture"
× Nothing
Bewertungsmethode: SC1/0
Explanation
The value of a is True, and the value of b is False. The first conditional (if statement) will check if eit
print "Coding", and since a is True, this line will be printed. The second conditional expects both a A
the case, it will not print "Architecture".
"Coding": Richtig
"Architecture": Nicht richtig
"Coding"
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
13 von 14
07.11.2024, 17:10

## S. 14

"Architecture": Nicht richtig
Nothing: Nicht richtig
◀ Questionnaire
Direkt zu:
Python Questionnaire: Überprüfung des Testversuchs (Seite 2 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
14 von 14
07.11.2024, 17:10

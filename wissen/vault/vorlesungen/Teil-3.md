---
titel: "Teil 3"
quelle: "Studium Andrin (HSLU/ETH)"
datei: "Teil 3.pdf"
seiten: 14
ocr-seiten: 0
tags: [bauwissen, vorlesung]
---

# Teil 3

## S. 1

Frage 29
Richtig
Erreichbare Punkte: 2.00
Data types
Given a string s = "Welcome", which of the following code is incorrect?
× print(s.lower())
× print(s[0])
✓s[1]="r"
× print(s[:2])
Bewertungsmethode: SC1/0
Explanation:
A string can be considered as a list of characters, so we can iterate through those characters like w
list.
However, there is a core difference between a string and an actual list data type; strings are immuta
means that we can't change the object's state after we have created it. In simple words, If we try to
throw an error.
The statement s[1]="r" tries to replace the value e in the string's index position 1, with the value r, a
print(s.lower()): Nicht richtig
print(s[0]): Nicht richtig
s[1]="r": Richtig
print(s[:2]): Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
1 von 14
07.11.2024, 17:11

## S. 2

Frage 30
Richtig
Erreichbare Punkte: 1.00
Data types
Which of the following is not a valid Python data type?
× list
S
✓struct
S
× tuple
S
× set
S
Bewertungsmethode: SC1/0
Explanation
There is no python data type with the name struct.
list: Nicht richtig
struct: Richtig
tuple: Nicht richtig
set: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
2 von 14
07.11.2024, 17:11

## S. 3

Frage 31
Richtig
Erreichbare Punkte: 1.00
Data types
How do you create an empty list in Python?
×
()
S
✓
[]
S
✓
×
{}
S
×
<>
S
Bewertungsmethode: SC1/0
Explanation:
The syntax [] in python defines a new list.
()
: Nicht richtig
[]
: Richtig
{}
: Nicht richtig
<>
: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
3 von 14
07.11.2024, 17:11

## S. 4

Frage 32
Richtig
Erreichbare Punkte: 2.00
Data types
What will the following code output?
beams = [1, 2, 3, 4] 
print(beams[1])
× 4
S
✓2
S
✓
× 3
S
× 1
S
Bewertungsmethode: SC1/0
Explanation
The first index of a list is 0, the second is 1, and so on. In this code we access index 1, which is the s
value 2.
4: Nicht richtig
2: Richtig
3: Nicht richtig
1: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
4 von 14
07.11.2024, 17:11

## S. 5

Frage 33
Richtig
Erreichbare Punkte: 1.00
Data types
Which of the following operators allows to concatenate two strings in Python?
×
&
S
×
*
S
✓
+
S
✓
×
,
S
Bewertungsmethode: SC1/0
Explanation:
String concatenation is a pretty common operation consisting of joining two or more strings togethe
Perhaps the quickest way to achieve concatenation is to take two separate strings and combine the
known as the concatenation operator in this context.
&
: Nicht richtig
*
: Nicht richtig
+
: Richtig
,
: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
5 von 14
07.11.2024, 17:11

## S. 6

Frage 34
Richtig
Erreichbare Punkte: 1.00
Data types
Which is a valid variable name in Python?
× price_in_$
× old-data
✓_output
× 1_data
Bewertungsmethode: SC1/0
Explanation:
There are the two syntax rules we need to follow when we're naming variables:
- We must use only letters, numbers, or underscores (we can't use apostrophes, hyphens, spaces, e
- Variable names can't begin with a number.
price_in_$: Nicht richtig
old-data: Nicht richtig
_output: Richtig
1_data: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
6 von 14
07.11.2024, 17:11

## S. 7

Frage 35
Richtig
Erreichbare Punkte: 2.00
Data types
Consider the following code. What will it print?
blueprint = [1, 2, 3, 4]
blueprint[1:3] = [0, 0]
print(blueprint)
× [1, 2, 3, 4]
× [1, 0, 0, 0, 4]
✓[1, 0, 0, 4]
× [2, 3]
Bewertungsmethode: SC1/0
Explanation
Using the slice notation (:) allows accessing items in a list, but when used on the left-hand side of a
replace values in the list. In our case, we select the values between index 1 and 3 using list[start_ind
inclusive, while end_index is exclusive), and replace them with [0, 0]. This results into a list that con
the two zeros that we replaced, and the last item of the original list.
[1, 2, 3, 4]: Nicht richtig
[1, 0, 0, 0, 4]: Nicht richtig
[1, 0, 0, 4]: Richtig
[2, 3]: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
7 von 14
07.11.2024, 17:11

## S. 8

Frage 36
Richtig
Erreichbare Punkte: 2.00
Functions
What is the output of the following code:
my_list = ['a','b','c','d']
print("".join(my_list))
× None
✓abcd
× ['a','b','c','d']
× SyntaxError
Bewertungsmethode: SC1/0
Explanation
The method .join() of string objects combines multiple strings. Since it's a method of a string object
example, it's an empty string, so it combines the letters a, b, c and d, using an empty string betwee
"-".join(my_list), we would get "a-b-c-d" as result.
None: Nicht richtig
abcd: Richtig
['a','b','c','d']: Nicht richtig
SyntaxError: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
8 von 14
07.11.2024, 17:11

## S. 9

Frage 37
Richtig
Erreichbare Punkte: 2.00
Functions
What is the output of the following code?
def display_info(username, grade='A'):
  print("Username: {}, Grade: {}".format(username, grade))
display_info("ETH_Amazing_Student")
× Username: ETH_Amazing_Student
× TypeError
× Username: ETH_Amazing_Student, Grade:
✓Username: ETH_Amazing_Student, Grade: A
Bewertungsmethode: SC1/0
Explanation
The parameter grade has a default value of "A", so even if we don't pass a value for that parameter, 
that default.
Username: ETH_Amazing_Student: Nicht richtig
TypeError: Nicht richtig
Username: ETH_Amazing_Student, Grade:: Nicht richtig
Username: ETH_Amazing_Student, Grade: A: Richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
9 von 14
07.11.2024, 17:11

## S. 10

Frage 38
Richtig
Erreichbare Punkte: 2.00
Functions
Which function returns a sequence of numbers starting from 0 by default?
× loop()
S
× for()
S
✓range()
S
× list()
S
Bewertungsmethode: SC1/0
Explanation:
The range() function returns a sequence of numbers, starting from 0 by default, and increments b
specified number.
Syntax: range(start, stop, step)
start
(Optional) An integer number specifying at which position to start. Default is 0
stop
(Required) An integer number specifying at which position to stop (not included)
step
(Optional) An integer number specifying the increment. Default is 1
loop(): Nicht richtig
for(): Nicht richtig
range(): Richtig
list(): Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
10 von 14
07.11.2024, 17:11

## S. 11

Frage 39
Richtig
Erreichbare Punkte: 1.00
Functions
Suppose my_list = [3, 4, 5, 20, 5, 25, 1, 3].
What is my_list after my_list .pop(1)?
✓[3, 5, 20, 5, 25, 1, 3]
× [3, 4, 5, 20, 5, 25, 1, 3]
× [1, 3, 4, 5, 20, 5, 25]
× [1, 3, 3, 4, 5, 5, 20, 25]
Bewertungsmethode: SC1/0
Explanation:
pop(i) removes the i index element from the list.
[3, 5, 20, 5, 25, 1, 3]: Richtig
[3, 4, 5, 20, 5, 25, 1, 3]: Nicht richtig
[1, 3, 4, 5, 20, 5, 25]: Nicht richtig
[1, 3, 3, 4, 5, 5, 20, 25]: Nicht richtig
th
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
11 von 14
07.11.2024, 17:11

## S. 12

Frage 40
Richtig
Erreichbare Punkte: 2.00
Functions
If you have two lists, a = [1, 2, 3] and b = [4, 5, 6], which function could you use to print (1,4
× for x in a and y in b:
print(x, y)
✓for x, y in zip(a, b):
print(x, y)
× for x in a, y in b:
print(x, y)
× for (x,y) in (a,b):
print(x, y)
Bewertungsmethode: SC1/0
Explanation
The zip() function will combine two or more lists and returns a new list formed by the pairs (or triple
the lists.
for x in a and y in b:
print(x, y)
: Nicht richtig
for x, y in zip(a, b):
print(x, y)
: Richtig
for x in a, y in b:
print(x, y)
: Nicht richtig
for (x,y) in (a,b):
print(x, y)
: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
12 von 14
07.11.2024, 17:11

## S. 13

Frage 41
Falsch
Erreichbare Punkte: 2.00
Functions
What is the output of the following code?
def is_negative(value):
   return value < 0
print(is_negative(-4))
× None
S
✓True
S
× -4
S
× False
S
Bewertungsmethode: SC1/0
Explanation
The return of the function is_negative() is a expression using comparison operators, this means tha
False). In our case, when we call the function is_negative with the value -4, the function will return F
zero.
None: Nicht richtig
True: Richtig
-4: Nicht richtig
False: Nicht richtig
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
13 von 14
07.11.2024, 17:11

## S. 14

Frage 42
Richtig
Erreichbare Punkte: 1.00
Functions
What is called when a function is defined inside a class?
× another function
✓method
× class
× module
Bewertungsmethode: SC1/0
another function: Nicht richtig
method: Richtig
class: Nicht richtig
module: Nicht richtig
◀ Questionnaire
Direkt zu:
Python Questionnaire: Überprüfung des Testversuchs (Seite 3 von 4) ...
https://moodle-app2.let.ethz.ch/mod/quiz/review.php?attempt=4782...
14 von 14
07.11.2024, 17:11

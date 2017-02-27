import ast
import requests
from os import listdir, getcwd
import simplejson
import pandas as pd
API_KEY = 'AIzaSyBLr5shvFhDasTVx2JoTfEbv8enXbrKORQ'
TEST_LAT_LONG = [39.789, -74.97]
no_records = 0
no_name = 0
# loop through all rankings and find course_class_name, [lat, long] pairs
def load_courses():
    data_dir  = getcwd() + '/../Data/Rankings/'
    rankings = [x for x in listdir(data_dir) if x[0] != '.']
    # data in format {course_class_name : {lat : 12.1312, long : 123.123}}
    course_map = {}
    for ranking in rankings:
        with open(data_dir + ranking) as f:
            rank_data = simplejson.load(f)
        for course in rank_data['Courses']:
            class_name = create_class_name(course['CourseName'])
            if class_name not in course_map:
                course_map[class_name] = {'lat' : course['Coordinates'][0],
                                          'long' : course['Coordinates'][1],
                                          'CourseName' : course['CourseName']}
    return course_map

def create_class_name(course_name):
    course_name = course_name.replace("'",'').replace('.', '').replace('"','')\
        .replace(' ', '_').replace('&','').replace('-','_').replace('(','').replace(')','').lower()
    return course_name

def get_course_location_name(lat, long):
    url = 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + str(lat) + ',' + str(long) + '&key=' + API_KEY
    r = requests.get(url)
    location_data = ast.literal_eval(r.content)
    # print(location_data['status'])
    if location_data['status'] != 'ZERO_RESULTS':
        city = ''
        state = ''
        address_data = location_data['results'][0]['address_components']
        for component in address_data:
            if component['types'][0] == 'locality' and component['types'][1] == 'political':
                city = component['long_name']
            if component['types'][0] == 'administrative_area_level_1' and component['types'][1] == 'political':
                state = component['short_name']
        if len(city) != 0 and len(state) != 0:
            return [city, state]
        else:
            print('no name found')
            return ['no name found', 'no name found']
    else:
        print("no results found")
        return ['no name found', 'no results found']

if __name__ == '__main__':

    courses = load_courses()

    for c in list(courses.keys()):
        print("trying course: " + str(courses[c]['CourseName']))
        course = courses[c]
        course_location = get_course_location_name(course['lat'], course['long'])

        courses[c]['course_city'] = course_location[0]
        courses[c]['course_state'] = course_location[1]
    out_list = []
    for c in courses:
        out_list.append([c, courses[c]['CourseName'], courses[c]['course_city'], courses[c]['course_state']])
    pd.DataFrame(out_list).to_csv('../Data/supplemental/course_location_info_NEW.csv')


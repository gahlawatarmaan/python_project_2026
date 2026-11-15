#imports
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Qt5Agg')
import matplotlib.pyplot as pyp

#variables

    #data selectoin and normalizatoin
main_data   = pd.read_csv('ML stuff/house price prdection/house_price_prediction_dataset.csv')
main_data   = main_data.select_dtypes(exclude=['object', 'string'])
train_data  = main_data.drop('price', axis='columns')

    #means, mins, maxs of training data
means       = train_data.mean().to_numpy()
mins        = train_data.min().to_numpy()
maxs        = train_data.max().to_numpy()

    #normalized data and target
nrml_data   = (train_data - train_data.min())/(train_data.max() - train_data.min()) #normalized traning data
y           = main_data['price'].to_numpy() #target
nrml_y      = (y - y.min())/(y.max() - y.min()) #normalized target

    #other parameters
w           = np.zeros(nrml_data.shape[1]) #weights
b           = 0 #bias
m           = nrml_data.shape[0] #total data entries in traning data
iter        = 10000
alpha       = 0.1 #0.1 can work on normalized data

#code

    #analyse the data
data_to_plot = {
    'nrml_sqft_living' : np.array(nrml_data['sqft_living']),
    'nrml_price'       : np.array(nrml_y),
    'Age'              : np.array(2026 - train_data['year_built']),
    'bedrooms'         : np.array(nrml_data['bedrooms']),
    'lot_size'         : np.array(nrml_data['lot_size'])
}
x_axis  = 'lot_size'
fig, ax = pyp.subplots()
# ax.scatter( f'{x_axis}', 'nrml_price', data= data_to_plot)
ax.set_xlabel(f'{x_axis}')
ax.set_ylabel('nrml_price')
# pyp.show()

#converting data to arrays
f_X = nrml_data.to_numpy() #final X
f_y = nrml_y #final y

    #model
def f_wb(X_i, w, b) -> float:
    return np.dot(X_i, w) + b

    #sqr cost func
def sqr_cst(X, w, y, b, m) -> float:
    pred = np.dot(X, w) + b
    error_sq = np.sum((pred - y)**2)

    return error_sq*(1/(2*m))
    #gradient descent
def grad_desc(X, y, w, b, m, iter, alpha):
    for k in range(iter):
        #predictions and errors
        pred = np.dot(X, w) + b
        error = pred - y

        w -=  np.dot(error, X)*(1/m)*alpha
        b -= alpha*np.sum(error)*(1/m)

        if k % 1000 == 0:
            print(f'w : {w}, b : {b}, cost: {sqr_cst(X, w, y, b, m)}')
    return w, b

#So, let us save this value in the finally in our values ands finds the result
w, b = grad_desc(f_X, f_y, w, b, m, iter, alpha) #weights, bias

#example run
inp = input('Input features in form of an array: ').split(',')
inp_arr = np.array(inp)
inp_arr = inp_arr.astype(float)
nrm_inp = (inp_arr - mins)/(maxs - mins)

pred = f_wb(nrm_inp, w, b)
denrml_pred = (y.max() - y.min())*(pred) + + y.min()

print(denrml_pred)
#we can change the inp to an input statement and get user input to get user input
#This file includes the general Aztec diamond shuffler set up to work in Julia. Written by Davide and Sunil, code added by Roger for gamma-distributed weights.

using Distributions #needed for gamma random variables, see https://juliastats.org/Distributions.jl/v0.14/starting.html and https://economictheoryblog.com/2018/11/07/generate-gamma-distributed-numbers-in-julia/. You have to load this package through a terminal command first.
using StatsBase
using Statistics #for computing variance
using Plots #so far nothing in this document uses Plots but it's helpful to have loaded to make plots in terminal

# The first function computes the square move for all Aztec diamonds from the size of x1, the input, down to 1.  It outputs a matrix with the weights, as well as the exponents in case of zero weights. 
function d3pslim(x1)
	n=size(x1)[1]
	m=convert(Int,floor(n/2))
	A1=[]
	A2=[]
	B=zeros(n,n)
	C=zeros(n,n)
	for i=0:n-1
		for j=0:n-1
			if x1[i+1,j+1]==0
				B[i+1,j+1]=1.0
				C[i+1,j+1]=1.0
			else
				B[i+1,j+1]=float(x1[i+1,j+1])
				C[i+1,j+1]=0.0
			end
		end
	end	
	A1=[B]
	A2=[C]
	for k=0:m-2 #(m-1)
		B=zeros(n-2*k-2,n-2*k-2)
		C=zeros(n-2*k-2,n-2*k-2)
		for i in 0:(n-2*k-3)
			for j in 0:(n-2*k-3)
				a1=[A1[k+1][i+2*(i%2)+1,j+2*(j%2)+1]  A2[k+1][i+2*(i%2)+1,j+2*(j%2)+1]]
				if A2[k+1][i+2*(i%2)+1,j+2*(j%2)+1]+A2[k+1][i+2,j+2]== A2[k+1][i+2*(i%2)+1,j+2]+A2[k+1][i+2,j+2*(j%2)+1]
					a2=[A1[k+1][i+2*(i%2)+1,j+2*(j%2)+1]*A1[k+1][i+2,j+2]+A1[k+1][i+2*(i%2)+1,j+2]*A1[k+1][i+2,j+2*(j%2)+1]  A2[k+1][i+2*(i%2)+1,j+2*(j%2)+1]+A2[k+1][i+2,j+2]]
				elseif A2[k+1][i+2*(i%2)+1,j+2*(j%2)+1]+A2[k+1][i+2,j+2] < A2[k+1][i+2*(i%2)+1,j+2]+A2[k+1][i+2,j+2*(j%2)+1]
					a2=[A1[k+1][i+2*(i%2)+1,j+2*(j%2)+1]*A1[k+1][i+2,j+2]  A2[k+1][i+2*(i%2)+1,j+2*(j%2)+1]+A2[k+1][i+2,j+2]]
				else
					a2=[A1[k+1][i+2*(i%2)+1,j+2]*A1[k+1][i+2,j+2*(j%2)+1]  A2[k+1][i+2*(i%2)+1,j+2]+A2[k+1][i+2,j+2*(j%2)+1]]
					end
				B[i+1,j+1]=a1[1]/a2[1]
				C[i+1,j+1]=a1[2]-a2[2]
				end
		end
		append!(A1,[B])
		append!(A2,[C])
	end
	return [[A1] [A2]]
end


#
#This function outputs the probabilities that are needed for the creation steps. The output is a list of gives a list of matrices, with the first being the creation probabilities for an Aztec diamond of size 1. 

function probsslim(x1)
	a0=d3pslim(x1)
	a1=a0[1]
	a2=a0[2]
	n=length(a1)
	A=[]
	for k in 0:n-1
		C=zeros(k+1,k+1)
		for i in 0:k
			row=[]
			for j in 0:k
				if a2[n-k][2*i+1,2*j+1]+a2[n-k][2*i+2,2*j+2] >a2[n-k][2*i+2,2*j+1]+a2[n-k][2*i+1,2*j+2]
					C[i+1,j+1]=0.0
				elseif a2[n-k][2*i+1,2*j+1]+a2[n-k][2*i+2,2*j+2] <a2[n-k][2*i+2,2*j+1]+a2[n-k][2*i+1,2*j+2]
					C[i+1,j+1]=1.0
				else
					C[i+1,j+1]=(a1[n-k][2*i+2,2*j+2]*a1[n-k][2*i+1,2*j+1])/(a1[n-k][2*i+2,2*j+2]*a1[n-k][2*i+1,2*j+1]+a1[n-k][2*i+2,2*j+1]*a1[n-k][2*i+1,2*j+2])
				end
			end
		end
		append!(A,[C])
	end
	return A 
 end


#This does the deletion step and the sliding step for an Aztec diamond x1, giving an Aztec diamond with size one bigger with holes. 
function delslideslim(x1)
	n=size(x1)[1]
	m=convert(Int,floor(n/2))
	a0=zeros(Int,n+2,n+2)
	for i=0:n+1
		for j=0:n+1
			if (i==0) || (i==n+1) || (j==0) || (j==n+1)
				a0[i+1,j+1]=0
			else
				a0[i+1,j+1]=x1[i,j]
			end
		end
	end
	for i in 0:m-1
		for j in 0:m-1
			if a0[2*i+1,2*j+1]==1 && a0[2*i+2,2*j+2]==1
				a0[2*i+1,2*j+1]=0
				a0[2*i+2,2*j+2]=0
          		elseif a0[2*i+1,2*j+2]==1 && a0[2*i+2,2*j+1]==1
     				a0[2*i+2,2*j+1]=0
				a0[2*i+1,2*j+2]=0
			end
		end
	end
	for i in 0:m
		for j in 0:m
			if a0[2*i+2,2*j+2]==1
				a0[2*i+1,2*j+1]=1
				a0[2*i+2,2*j+2]=0
			elseif a0[2*i+1,2*j+1]==1
				a0[2*i+1,2*j+1]=0
				a0[2*i+2,2*j+2]=1
			elseif a0[2*i+2,2*j+1]==1
				a0[2*i+1,2*j+2]=1
				a0[2*i+2,2*j+1]=0
			elseif a0[2*i+1,2*j+2]==1
				a0[2*i+2,2*j+1]=1
				a0[2*i+1,2*j+2]=0
			end
		end
	end
	return a0
end




# This gives the probabilities for the creation steps.
function createslim(x0,p)
	n=size(x0)[1]
	m=convert(Int,floor(n/2))
	for i in 0:m-1
		for j in 0:m-1
			if (x0[2*i+1,2*j+1]==0) && (x0[2*i+2,2*j+1]==0) && (x0[2*i+1,2*j+2]==0) && (x0[2*i+2,2*j+2]==0)
				if j>0 
					a1= (x0[2*i+1,2*j]==0)&(x0[2*i+2,2*j]==0)
				else
					a1=true
				end
				if j<m-1
					a2=(x0[2*i+1,2*j+3]==0)&(x0[2*i+2,2*j+3]==0)
				else
					a2=true
				end
				if i>0
					a3=(x0[2*i,2*j+1]==0)&(x0[2*i,2*j+2]==0)
				else	
					a3=true
				end
				if i<m-1
					a4=(x0[2*i+3,2*j+1]==0)&(x0[2*i+3,2*j+2]==0)
				else
					a4=true
				end
				if a1==true && a2==true && a3==true && a4==true
					if rand()<p[i+1,j+1]
						x0[2*i+1,2*j+1]=1
						x0[2*i+2,2*j+2]=1
					else
						x0[2*i+2,2*j+1]=1
						x0[2*i+1,2*j+2]=1				
					end
				end
			end
		end
	end
	return x0	
end
# This generates an Aztec diamond with the inputs given by probabilities of the creations of the Aztec diamond (i.e. the output of probsslim) and using the functions above.
function aztecgenslim(x0)
	n=length(x0)
	if rand()<x0[1][1,1]
		a1=[1 0;0 1]
	else
		a1=[0 1;1 0]
	end
	for i in 0:n-2
		a1=delslideslim(a1)
		a1=createslim(a1,x0[i+2])
	end
	return a1
end


#This writes to a file if the list is a list of lists.
function writefile(m,filename)
	n=length(m)
	f=open(filename,"w")
	for i=1:n
		for j=1:n
        		write(f,string(" ",m[i][j]," "))
		end
		write(f,"\n") 
	end
	close(f)
end

#This also writes to a file if the list is a matrix
function writefile2(m,filename)
	n=size(m)[1]
	f=open(filename,"w")
	for i=1:n
		for j=1:n
        		write(f,string(" ",m[i,j]," "))
		end
		write(f,"\n") 
	end
	close(f)
end




function uniform(n)
    [1.0 for i in 1:2n, j in 1:2n]
end

#Transpose function
function maketranspose(x0)
	n=length(x0)
	A=[]
	for i in 1:n
		row=[]
		for j in 1:n
			append!(row, x0[j][i] )
		end
		append!(A, [row] )
		end	
	return(A)
end


##########################################above here is Davide-Sunil stuff Roger hasn't touched (except running some packages in preamble)#####################





#makes a table of weights for Aztec diamond of size 2n, with weights as in https://arxiv.org/pdf/2208.01344.pdf, figure 1, where a_{i,j} and b_{i,j} are all iid Gamma(shape,scale) random variables. We use the same coordinates as there, except flipped around the horizontal axis.

function iid_gamma(n,shape,scale)
	weights = reshape(rand(Gamma(shape,scale),2*(n)^2),2*n,n) #a 2n x n matrix giving both a_{i,j} and b_{i,j} parameters
	A = ones(2*n, 2*n)
	for j in 1:n
		A[:,2*j-1] = weights[:,j]
		end
	return(A)
end

function ab_gamma(n,ashape,bshape)
	A = ones(2*n, 2*n)
	for i in 1:2*n
		if i%2==1
			for j in 1:2*n
				if j%2==1
					A[i,j] = rand(Gamma(bshape,1))
				end
				if j%2==0
					A[i,j] = rand(Gamma(ashape,1))
				end
			end
		end
	end
	return(A)
end

#below is like the above, but the weights are 0 at the boundaries of the corners of the Aztec, so one gets a nontrivial tiling in the inscribed square. Note I don't think these can be realized as an instance of our shuffling-invarianct weights

function iid_gamma_square(n,shape,scale)
	A = ones(2*n,2*n)
	for j in 1:2*n
		for i in 1:2*n
			if i+j >= n+1 && i-j >= -n && i+j <= 3n+1 && i-j <= n
				if i+j == n+1 || i+j == 3n+1 || i-j == -n || i-j == n
					A[i,j] = 0
				else
					if j%2 == 1
						A[i,j] = 1
					end
					if j%2 == 0
						A[i,j] = rand(Gamma(shape,scale))
					end
				end
			end
		end
	end
	return(A)
end

#By setting c_j = \psi_j = 0 for j <= ymin and j >= ymax, we can get rows of zero weights, which maybe are enough to constrain the tiling to only be nontrivial inside a strip

#below are the weights of Le Doussal et al.'s paper: probabilities are proportional to e^{-beta H}, where hamiltonian H is a sum of iid standard gaussians at each bond inside the inscribed square, so the bond strengths are e^{-beta X} where X are iid standard Gaussians (and are zero outside the inscribed square).

function lognormal_square(n,beta)
	A = zeros(2*n,2*n)
	for j in 1:2*n
		for i in 1:2*n
			if i+j > n && i-j > -n-1 && i+j < 3n+2 && i-j < n+1
				A[i,j] = exp(beta*rand(Normal()))
			end
		end
	end
	return(A)
end

#a variant with fewer zero weights:

function lognormal_square2(n,beta)
	A = ones(2*n,2*n)
	for j in 1:2*n
		for i in 1:2*n
			if i+j >= n+1 && i-j >= -n && i+j <= 3n+1 && i-j <= n
				if i+j == n+1 || i+j == 3n+1 || i-j == -n || i-j == n
					A[i,j] = 0
				else
					A[i,j] = exp(beta*rand(Normal()))
				end
			end
		end
	end
	return(A)
end


#square with uniform weights, to compare the others with. This is currently broken when n is odd, be warned:


function uniform_square(n)
	A = ones(2*n,2*n)
	for j in 1:2*n
		for i in 1:2*n
			if i+j == n+1 || i+j == 3n+1 || i-j == -n || i-j == n
				A[i,j] = 0
			end
		end
	end
	return(A)
end


#aztec with all bonds lognormal:

function lognormal_aztec(n,beta)
	A = zeros(2*n,2*n)
	for j in 1:2*n
		for i in 1:2*n
			A[i,j] = exp(beta*rand(Normal()))
		end
	end
	return(A)
end


#height function of a given aztec tiling at a point x,y, expressed as a matrix as output by aztecgenslim. The height function is defined on the faces of the underlying graph of the Aztec diamond (equivalently, the vertices of the graph that the dominoes tile). We give the faces coordinates so that the one with lower-left vertices (x-1,y) and (x,y-1) (see Chhita-Duits Fig. 1) has coordinates x,y, so that e.g. the bottom-left face has coordinates (1,1), and the coordinates of the faces along the botton are (1,1), (3,1), (5,1) and those of the row above are (2,2), (4,2), then (1,3), (3,3), (5,3), etc. Because the number of faces in each row differs based on parity, for simplicity we will just give the below definition for even x-coordinate, though one could define another case to do it in general. We take the height at face (0,0) (which only is adjacent to one of the edges in Fig. 1, the bottom-left edge) to be 2n, so that all heights are nonnegative. Note this function complains if x or y are 0 or 2n, though this could be fixed. NOTE: this is the dimer height function, not the LGV height function.

function height(tiling,x,y)
	if x%2 != 0 || y%2 != 0
		return("you need to input even coordinates")
	end
	hh = length(tiling[1,:])-x#initialize height at the boundary face (only the upper two of its bounding edges are included in the graph) of coordinates (x,0)
	for i in 0:(y/2-1) #loop over points between that boundary point and (x,y-1), adding height increments above each one
		if tiling[x,Int(2*i+1)] == 1 || tiling[x,Int(2*i+2)] == 1
			hh += 2
		else
			hh -= 2
		end
	end
	return(hh)
end

#probs is the output of probsslim applied to the desired weights, trials is a nonnegative Int, and x, y are even coordinates (see above). Computes trials independent aztec tilings using weights, computes their height at x,y, and finds the variance. 

function hvar(probs, trials, x, y)
	heights = []
	for i in 1:trials
		push!(heights,height(aztecgenslim(probs),x,y))
	end
	return(var(heights))
end


#matrix of all heights of input tiling. It will be n x n, where n is the dimension of the aztec diamond, and is gotten by the height field in Le Doussal et al Fig. 2 (left) with one row and one column of boundary values removed (in our conventions, one would remove the top-right and bottom-right boundary values in LD et al's figure).

function heightfield(tiling)
	L = length(tiling[1,:])
	n = Int(L/2)
	oldheights = 2*reverse(collect(1:n))
	A = [oldheights]
	for x in 1:2n-1 #at each step, this loop will add a new row of height values
		if x%2 == 0
			newheights = [2*n-x] #prefill one boundary value
			for y in 2:2:(2n-2)
				if tiling[x,y] == 1
					push!(newheights,oldheights[Int(y/2)]+3)
				elseif tiling[x,y] == 0
					push!(newheights,oldheights[Int(y/2)]-1)
				end
			end
		else
			newheights = []
			for y in 1:2:(2n-1)
				if tiling[x,y] == 0
					push!(newheights,oldheights[Int((y+1)/2)]+1)
				elseif tiling[x,y] == 1
					push!(newheights,oldheights[Int((y+1)/2)]-3)
				end
				#println(newheights)
			end
		end
		push!(A,deepcopy(newheights))
		oldheights = newheights
	end
	return(A)
end


#above height field with spatial average subtracted
function centered_heightfield(tiling)
	h = heightfield(tiling)
	m = sum(sum(h))/(length(h)*length(h[1]))
	return([hh-fill(m,length(h[1])) for hh in h])
end

#above height field with spatial average subtracted, but only spatially averages in inscribed square. Definitely some off-by-one errors in restricting i,j to be in the square.

function centered_heightfield_square(tiling)
	h = heightfield(tiling)
	n = Int(length(h)/2)
	println(n)
	m = 0
	num = 0
	for j in 1:2*n
		for i in 1:n
			if 2i+j >= n+1 && 2i-j >= -n && 2i+j <= 3n+1 && 2i-j <= n
				m += h[j][i]
				num += 1
			end
		end
	end
	println(num)
	ave = m/num
	println(5)
	return([hh-fill(ave,length(h[1])) for hh in h])
end


#computes many height fields, on which we can then make plots

function heighttrials(probs,numtrials)
	heights = []
	for i in 1:numtrials
		push!(heights,heightfield(aztecgenslim(probs)))
	end
	return(heights)
end

#Computes h(x1,y1) - h(x2,y2) for input tiling.

function hdiff(tiling,x1,y1,x2,y2)
	hf = heightfield(tiling)
	return(hf[x1,y1] - hf[x2,y2])
end

#below has first argument the output of probsslim, second argument is the number of trials, and computes a matrix whose i,jth entry is the variance of h(i,j) (in the coordinates of the above function, i in 1:n, j in 1:2n)

function var_mat(probs,numtrials)
	n = length(probs)
	heightmats = []
	for i in 1:numtrials
		push!(heightmats,heightfield(aztecgenslim(probs)))
	end
	vars = zeros(2n,n)
	for i in 1:2n
		for j in 1:n
			ijheights = [heightmat[i][j] for heightmat in heightmats]
			vars[i,j] = var(ijheights)
		end
	end
	return(vars)
end

#like the above, except subtracts the spatial average, as in Le Doussal et al (17)

function cent_var_mat(probs,numtrials)
	n = length(probs)
	heightmats = []
	for i in 1:numtrials
		push!(heightmats,centered_heightfield(aztecgenslim(probs)))
	end
	vars = zeros(2n,n)
	for i in 1:2n
		for j in 1:n
			ijheights = [heightmat[i][j] for heightmat in heightmats]
			vars[i,j] = var(ijheights)
		end
	end
	return(vars)
end

#like the above but for tilings of the inscribed square, only takes heights in that square into account when computing spatial average

function cent_var_mat_square(probs,numtrials)
	n = length(probs)
	heightmats = []
	for i in 1:numtrials
		push!(heightmats,centered_heightfield_square(aztecgenslim(probs)))
	end
	vars = zeros(2n,n)
	for i in 1:2n
		for j in 1:n
			ijheights = [heightmat[i][j] for heightmat in heightmats]
			vars[i,j] = var(ijheights)
		end
	end
	return(vars)
end

#below computes, given i, the vector whose jth entry is the sample variance of the height 

function covariances_for_row(probs, numtrials, i, j)
    n = length(probs)
    heightmats = []
    for t in 1:numtrials
        push!(heightmats, heightfield(aztecgenslim(probs)))
    end
    # Collect the heights at (i, j) for all samples
    h_ij = [heightmat[i][j] for heightmat in heightmats]
    # Number of columns in the height field
    ncols = length(heightmats[1][1])
    # Collect the heights at (i, l) for all l and all samples
    h_il = [ [heightmat[i][l] for heightmat in heightmats] for l in 1:ncols ]
    # Compute means
    mean_ij = mean(h_ij)
    mean_il = [mean(hil) for hil in h_il]
    # Compute covariance for each l
    covariances = [mean((h_ij .- mean_ij) .* (h_il[l] .- mean_il[l])) for l in 1:ncols]
    return covariances
end

function plot_covs_row(probs, numtrials, i, j,label)
	covs = covariances_for_row(probs, numtrials, i, j)
	plot(1:length(covs), covs, title="Cov(h($i,$j),h($i,j)), weights $label", xlabel="j", ylabel="Covariance", legend=:outertopright)
end


function variances_for_row(probs, numtrials, i)
    n = length(probs)
    heightmats = []
    for t in 1:numtrials
        push!(heightmats, heightfield(aztecgenslim(probs)))
    end
    # Collect the heights at (i, j) for all samples
    h_ij = [[heightmat[i][j] for heightmat in heightmats] for j in 1:n]
    # Number of columns in the height field
    ncols = length(heightmats[1][1])

    # Compute covariance for each l
    variances = [var(h_ij[j]) for j in 1:ncols]
    return variances
end

function plot_vars_row(probs, numtrials, i,label)
	vars = variances_for_row(probs, numtrials, i)
	plot(1:length(vars), vars, title="Var(h($i,j)), weights $label", xlabel="j", ylabel="Covariance", legend=:outertopright)
end

function cov_var_row(probs, numtrials, i, j)
    n = length(probs)
    heightmats = []
    for t in 1:numtrials
        push!(heightmats, heightfield(aztecgenslim(probs)))
    end
    # Collect the heights at (i, j) for all samples
    h_ij = [heightmat[i][j] for heightmat in heightmats]
    # Number of columns in the height field
    ncols = length(heightmats[1][1])
    # Collect the heights at (i, l) for all l and all samples
    h_il = [ [heightmat[i][l] for heightmat in heightmats] for l in 1:ncols ]
    # Compute means
    mean_ij = mean(h_ij)
    mean_il = [mean(hil) for hil in h_il]
    # Compute covariance for each l
    covariances = [mean((h_ij .- mean_ij) .* (h_il[l] .- mean_il[l])) for l in 1:ncols]
	variances = [mean((h_il[l] .- mean_il[l]).^2) for l in 1:ncols]
    return covariances, variances
end

#safe division, to avoid division by zero and just return 0
safe_div(num, den) = den == 0 ? 0 : num/den

#plots the variance and covariance of h(i,j) with h(i,l) for l=1:n, as a function of l, for a given i and j.	Also plots variance along this slice for comparison, since often the locations of low covariance will simply be ones of low variance. Also plots normalized covariance by the standard deviation of each, which measures correlation. You must hand-input the label for the weights which appears on the plot.
function plot_vc_row(probs, numtrials, i, j, label)
    covs, vars = cov_var_row(probs, numtrials, i, j)
	ivars = sqrt.(vars[i])
	cors = [safe_div(covs[l],(sqrt(vars[l]).*ivars)) for l in 1:length(vars)]
	n = length(probs)
    lvals = 1:length(vars)
    plot(lvals, [vars covs cors],
         label=["Var(h($i,j))" "Cov(h($i,$j), h($i,j))" "Corr(h($i,$j), h($i,j))"],
         xlabel="j",
         ylabel="Value",
         title="n=$n, row i=$i, $numtrials trials, \n weights $label",
         legend=:outertopright)
    # Add a red dot at l = j
    scatter!([j], [vars[j]], color=:red, marker=:circle, label="Var at j=$j")
end


# function cov_slice_h(probs,numtrials,i)
# 	n = length(probs)
# 	heightmats = []
# 	for i in 1:numtrials
# 		push!(heightmats,heightfield(aztecgenslim(probs)))
# 	end
# 	vars = zeros(1,n)
# 	for j in 1:n
# 		ijheights = [heightmat[i][j] for heightmat in heightmats]
# 		vars[i,j] = var(ijheights)
# 	end
# 	end
# 	return(vars)
# end

#below computes the quantity in Le Doussal et al (17), without the 1/L^2 normalization, because that will be different depending on whether our weights restrict us to a square within the aztec or not. Arguments are same as above.

function spatial_var(probs,numtrials)
	L = length(probs[length(probs)][1,:])
	var = 0
	varmat = cent_var_mat(probs,numtrials)
	for i in 1:L
		for j in 1:L
			var += varmat[i,j]
		end
	end
	return(var)
end


#the version below just sums the variances in the square, to be used when the tiling is nontrivial only inside the square, as otherwise I think the centering may mess us up

function spatial_var_square(probs,numtrials)
	L = length(probs[length(probs)][1,:])
	var = 0
	varmat = cent_var_mat_square(probs,numtrials)
	for j in 1:2*n
		for i in 1:2*n
			if i+j >= n+1 && i-j >= -n && i+j <= 3n+1 && i-j <= n
				var += varmat[i,j] 
			end
		end
	end
	return(var)
end


#below has first argument the output of probsslim, second argument is the number of trials, next arguments x0,y0 coordinates for tiling, and outputs a vector whose elements are sample variance var(h(x0,y0) - h(x0,y0)).

function cdvars(probs,numtrials,x0,y0)
	L = length(probs[length(probs)][1,:])
	height_diffs = []
	for i in 1:numtrials
		heights = heightfield(aztecgenslim(probs))
		push!(height_diffs,heights[x0] - heights[x0][y0]*ones(L))
	end
	vars = zeros(L)
	for y in 1:L
			yheightdiffs = [height_diff[y] for height_diff in height_diffs]
			vars[y] = var(yheightdiffs)
	end
	return(vars)
end


#below function takes two tilings and outputs the number of edges on which they differ in whether there's a bond there

function edge_dist(tiling1, tiling2)
	d = 0
	for i in 1:length(tiling1)
		if tiling1[i] != tiling2[i]
			d += 1
		end
	end
	return(d)
end


############shuffle update weight stuff


function ahat(a,b)
	return(a/(a+b))
end

function bhat(a,b)
	return(b/(a+b))
end

function a00hh(a00,a10,a20,a0m1,a1m1,a2m1,b0m1,b00,b1m1,b10,b2m1,b20,a0m2,a1m2,b0m2,b1m2,a2m2,b2m2) #18 inputs
	a00h = a00*(a10+b10)/(a00+b00)
	b00h = b0m1*(a1m1+b1m1)/(a0m1+b0m1)
	a10h = a10*(a20+b20)/(a10+b10)
	b10h = b1m1*(a2m1+b2m1)/(a1m1+b1m1)
	a00hh = (a00h/(a00h+b00h))*(a10h+b10h)
	return(a00hh)
end

function b00hh(a00,a10,a20,a0m1,a1m1,a2m1,b0m1,b00,b1m1,b10,b2m1,b20,a0m2,a1m2,b0m2,b1m2,a2m2,b2m2)
	a0m1h = a0m1*(a1m1+b1m1)/(a0m1+b0m1)
	b0m1h = b0m2*(a1m2+b1m2)/(a0m2+b0m2) 
	a1m1h = a1m1*(a2m1+b2m1)/(a1m1+b1m1)
	b1m1h = b1m2*(a2m2+b2m2)/(a1m2+b1m2)
	b00hh = (b0m1h/(a0m1h+b0m1h))*(a1m1h+b1m1h)
	return(b00hh)
end


	





##############################################below is Davide-Sunil stuff Roger hasn't touched###############################################

	

#Makes a table for random entried Aztec diamond of size 2n with two-periodic randomness in each direction.  The edge weights are the same on each row. We do not need this function, but keep it here from the old code for sanity-checks.

function randomtwoentries(n,a)
	A=zeros(2*n,2*n)
	for i in 0:n-1
		q1=rand()
		q2=a+rand()
		for j in 0:n-1
			if i%2==0
				if j%2==0 
					A[2*i+1,2*j+1]=q1
					A[2*i+1,2*j+2]=q1
					A[2*i+2,2*j+1]=q1
					A[2*i+2,2*j+2]=q1
				else
					A[2*i+1,2*j+1]=q2
					A[2*i+1,2*j+2]=q2
					A[2*i+2,2*j+1]=q2
					A[2*i+2,2*j+2]=q2
				end
			else	
				if j%2==0 
					A[2*i+1,2*j+1]=q2
					A[2*i+1,2*j+2]=q2
					A[2*i+2,2*j+1]=q2
					A[2*i+2,2*j+2]=q2
				else
					A[2*i+1,2*j+1]=q1
					A[2*i+1,2*j+2]=q1
					A[2*i+2,2*j+1]=q1
					A[2*i+2,2*j+2]=q1
				end
			end
		end
	end
	return(A)
end	

function makefile(weights,name)
	writefile2(aztecgenslim(probsslim(weights)),string(name))
end




#code from Davide and Sunil's simulations below this point, probably don't need but worthwhile syntax examples:

#n=107
#m=105
#M=100
#a=1.0


#@time #writefile2(aztecgenslim(probsslim(transpose(maketacall(n,m,M,a)))),string("outputn",n,"m",m,"M",M,"a1"))
#writefile2(transpose(maketacallrem(n,m,M,a)),string("outputremn",n,"m",m,"M",M,"a1"))

#n=200
#@time writefile2(aztecgenslim(probsslim(randomtwoentriesMat(400,0.0,0,2.0,0))), #string("testn400v0a00u2b00")) 
#@time writefile2(aztecgenslim(probsslim(randomtwoentriesMat(400,0.0,0,1.0,0))), #string("testn400v0a00u1b00")) 
#@time writefile2(aztecgenslim(probsslim(randomtwoentriesMat(400,0.0,0,3.0,0))), #string("testn400v0a00u3b00")) 

#@time writefile2(aztecgenslim(probsslim(rand(Float64,(2*n,2*n)))), string("rand")) 

#a=0.5
#@time writefile2(aztecgenslim(probsslim(randomtwoentries(n,a))), string("randtwon",n))	  

